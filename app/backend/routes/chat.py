from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import asyncio
import re
from typing import List, Optional, Dict
from datetime import datetime, timedelta

from app.backend.database import get_db
from app.backend.models.schemas import ErrorResponse, HedgeFundRequest, GraphNode, GraphEdge
from app.backend.models.events import StartEvent, ProgressUpdateEvent, ErrorEvent, CompleteEvent
from app.backend.services.graph import create_graph, parse_hedge_fund_response, run_graph_async
from app.backend.services.portfolio import create_portfolio
from app.backend.services.api_key_service import ApiKeyService
from src.utils.progress import progress
from src.utils.analysts import ANALYST_CONFIG

router = APIRouter(prefix="/chat")

def extract_tickers_from_text(text: str) -> List[str]:
    """
    Extract stock tickers from natural language text.
    Tickers are typically 1-5 uppercase letters.
    """
    # Pattern to match stock tickers (1-5 uppercase letters, possibly followed by numbers)
    # Common patterns: AAPL, MSFT, GOOGL, BRK.B, etc.
    ticker_pattern = r'\b([A-Z]{1,5}(?:\.[A-Z])?)\b'
    
    # Find all matches
    matches = re.findall(ticker_pattern, text.upper())
    
    # Filter out common words that might match the pattern
    common_words = {'I', 'A', 'AM', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 
                   'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 
                   'US', 'WE', 'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 
                   'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 
                   'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 
                   'WHO', 'BOY', 'DID', 'HAD', 'HAS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 
                   'USE', 'YET', 'BUY', 'SELL', 'STOCK', 'STOCKS', 'SHARE', 'SHARES'}
    
    # Extract unique tickers and filter out common words
    tickers = []
    seen = set()
    for match in matches:
        ticker = match.upper()
        # Skip if it's a common word or already seen
        if ticker not in common_words and ticker not in seen:
            tickers.append(ticker)
            seen.add(ticker)
    
    return tickers

def create_default_graph() -> tuple[List[GraphNode], List[GraphEdge]]:
    """
    Create a default graph structure with all available analysts.
    """
    nodes = []
    edges = []
    
    # Create a portfolio manager node
    portfolio_manager_id = "portfolio_manager_000000"
    nodes.append(GraphNode(
        id=portfolio_manager_id,
        type="portfolio_manager",
        data={"name": "Portfolio Manager"},
        position={"x": 800, "y": 400}
    ))
    
    # Create a risk manager node
    risk_manager_id = "risk_management_agent_000000"
    nodes.append(GraphNode(
        id=risk_manager_id,
        type="risk_manager",
        data={"name": "Risk Manager"},
        position={"x": 600, "y": 400}
    ))
    
    # Connect risk manager to portfolio manager
    edges.append(GraphEdge(
        id="edge_risk_portfolio",
        source=risk_manager_id,
        target=portfolio_manager_id
    ))
    
    # Create nodes for all available analysts
    x_start = 100
    y_start = 100
    x_spacing = 200
    y_spacing = 150
    cols = 4
    
    analyst_keys = list(ANALYST_CONFIG.keys())
    for idx, analyst_key in enumerate(analyst_keys):
        row = idx // cols
        col = idx % cols
        analyst_id = f"{analyst_key}_000000"
        
        nodes.append(GraphNode(
            id=analyst_id,
            type="analyst",
            data={"name": ANALYST_CONFIG[analyst_key].get("name", analyst_key)},
            position={"x": x_start + col * x_spacing, "y": y_start + row * y_spacing}
        ))
        
        # Connect analyst to risk manager
        edges.append(GraphEdge(
            id=f"edge_{analyst_id}_risk",
            source=analyst_id,
            target=risk_manager_id
        ))
    
    return nodes, edges

class ChatRequest(BaseModel):
    message: str
    api_keys: Optional[Dict[str, str]] = None

@router.post(
    path="/analyze",
    responses={
        200: {"description": "Successful response with streaming updates"},
        400: {"model": ErrorResponse, "description": "Invalid request parameters"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def chat_analyze(request_data: ChatRequest, request: Request, db: Session = Depends(get_db)):
    """
    Chat endpoint that accepts natural language queries, extracts tickers,
    and runs hedge fund analysis with a default graph structure.
    """
    try:
        # Extract tickers from the message
        tickers = extract_tickers_from_text(request_data.message)
        
        if not tickers:
            raise HTTPException(
                status_code=400,
                detail="No stock tickers found in your message. Please mention stock tickers like AAPL, MSFT, or GOOGL."
            )
        
        # Hydrate API keys from database if not provided
        api_keys = request_data.api_keys
        if not api_keys:
            api_key_service = ApiKeyService(db)
            api_keys = api_key_service.get_api_keys_dict()
        
        # Create default graph structure
        graph_nodes, graph_edges = create_default_graph()
        
        # Create the portfolio
        portfolio = create_portfolio(
            initial_cash=100000.0,
            margin_requirement=0.0,
            tickers=tickers,
            portfolio_positions=None
        )
        
        # Construct agent graph using the default graph structure
        graph = create_graph(
            graph_nodes=graph_nodes,
            graph_edges=graph_edges
        )
        graph = graph.compile()
        
        # Set default dates (last 3 months)
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        
        # Log a test progress update for debugging
        progress.update_status("system", None, f"Analyzing {', '.join(tickers)}")
        
        # Create a HedgeFundRequest-like object for compatibility
        class ChatHedgeFundRequest:
            def __init__(self):
                self.tickers = tickers
                self.graph_nodes = graph_nodes
                self.graph_edges = graph_edges
                self.agent_models = None
                self.model_name = "gpt-4.1"
                self.model_provider = "OpenAI"
                self.margin_requirement = 0.0
                self.portfolio_positions = None
                self.api_keys = api_keys
                self.start_date = start_date
                self.end_date = end_date
                self.initial_cash = 100000.0
            
            def get_agent_ids(self):
                return [node.id for node in self.graph_nodes]
            
            def get_agent_model_config(self, agent_id: str):
                return self.model_name, self.model_provider
        
        chat_request = ChatHedgeFundRequest()
        
        # Function to detect client disconnection
        async def wait_for_disconnect():
            """Wait for client disconnect and return True when it happens"""
            try:
                while True:
                    message = await request.receive()
                    if message["type"] == "http.disconnect":
                        return True
            except Exception:
                return True
        
        # Set up streaming response
        async def event_generator():
            # Queue for progress updates
            progress_queue = asyncio.Queue()
            run_task = None
            disconnect_task = None
            
            # Simple handler to add updates to the queue
            def progress_handler(agent_name, ticker, status, analysis, timestamp):
                event = ProgressUpdateEvent(
                    agent=agent_name,
                    ticker=ticker,
                    status=status,
                    timestamp=timestamp,
                    analysis=analysis
                )
                progress_queue.put_nowait(event)
            
            # Register our handler with the progress tracker
            progress.register_handler(progress_handler)
            
            try:
                # Start the graph execution in a background task
                run_task = asyncio.create_task(
                    run_graph_async(
                        graph=graph,
                        portfolio=portfolio,
                        tickers=tickers,
                        start_date=start_date,
                        end_date=end_date,
                        model_name=chat_request.model_name,
                        model_provider=chat_request.model_provider,
                        request=chat_request,
                    )
                )
                
                # Start the disconnect detection task
                disconnect_task = asyncio.create_task(wait_for_disconnect())
                
                # Send initial message
                yield StartEvent().to_sse()
                
                # Stream progress updates until run_task completes or client disconnects
                while not run_task.done():
                    # Check if client disconnected
                    if disconnect_task.done():
                        print("Client disconnected, cancelling hedge fund execution")
                        run_task.cancel()
                        try:
                            await run_task
                        except asyncio.CancelledError:
                            pass
                        return
                    
                    # Either get a progress update or wait a bit
                    try:
                        event = await asyncio.wait_for(progress_queue.get(), timeout=1.0)
                        yield event.to_sse()
                    except asyncio.TimeoutError:
                        # Just continue the loop
                        pass
                
                # Get the final result
                try:
                    result = await run_task
                except asyncio.CancelledError:
                    print("Task was cancelled")
                    return
                
                if not result or not result.get("messages"):
                    yield ErrorEvent(message="Failed to generate hedge fund decisions").to_sse()
                    return
                
                # Send the final result
                final_data = CompleteEvent(
                    data={
                        "decisions": parse_hedge_fund_response(result.get("messages", [])[-1].content),
                        "analyst_signals": result.get("data", {}).get("analyst_signals", {}),
                        "current_prices": result.get("data", {}).get("current_prices", {}),
                    }
                )
                yield final_data.to_sse()
            
            except asyncio.CancelledError:
                print("Event generator cancelled")
                return
            finally:
                # Clean up
                progress.unregister_handler(progress_handler)
                if run_task and not run_task.done():
                    run_task.cancel()
                    try:
                        await run_task
                    except asyncio.CancelledError:
                        pass
                if disconnect_task and not disconnect_task.done():
                    disconnect_task.cancel()
        
        # Return a streaming response
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while processing the request: {str(e)}")

