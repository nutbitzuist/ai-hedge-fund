import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { extractBaseAgentKey } from '@/data/node-mappings';
import { createAgentDisplayNames } from '@/utils/text-utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState, useMemo } from 'react';
import { useNodeContext } from '@/contexts/node-context';
import { useFlowContext } from '@/contexts/flow-context';

interface InvestmentReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  outputNodeData: any;
  connectedAgentIds: Set<string>;
}

type ActionType = 'long' | 'short' | 'hold';

export function InvestmentReportDialog({
  isOpen,
  onOpenChange,
  outputNodeData,
  connectedAgentIds,
}: InvestmentReportDialogProps) {
  const { currentFlowId } = useFlowContext();
  const { getAgentNodeDataForFlow } = useNodeContext();
  
  // Get agent data to access backtest results
  const agentData = getAgentNodeDataForFlow(currentFlowId?.toString() || null);
  const backtestAgent = agentData?.['backtest'];
  
  // Check if this is a backtest result and return early if it is
  // Backtest results should be displayed in the backtest output tab, not in the investment report dialog
  if (outputNodeData?.decisions?.backtest?.type === 'backtest_complete') {
    return null;
  }

  // Return early if no output data
  if (!outputNodeData || !outputNodeData.decisions) {
    return null;
  }

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case 'long':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'short':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'hold':
        return <Minus className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getSignalBadge = (signal: string) => {
    const variant = signal === 'bullish' ? 'success' :
                   signal === 'bearish' ? 'destructive' : 'outline';

    return (
      <Badge variant={variant as any}>
        {signal}
      </Badge>
    );
  };

  const getConfidenceBadge = (confidence: number) => {
    let variant = 'outline';
    if (confidence >= 50) variant = 'success';
    else if (confidence >= 0) variant = 'warning';
    else variant = 'outline';
    const rounded = Number(confidence.toFixed(1));
    return (
      <Badge variant={variant as any}>
        {rounded}%
      </Badge>
    );
  };

  // Extract unique tickers from the data
  const tickers = Object.keys(outputNodeData.decisions || {});

  // Use the unique node IDs directly since they're now stored as keys in analyst_signals
  const connectedUniqueAgentIds = Array.from(connectedAgentIds);
  const agents = Object.keys(outputNodeData.analyst_signals || {})
    .filter(agent =>
      extractBaseAgentKey(agent) !== 'risk_management_agent' && connectedUniqueAgentIds.includes(agent)
    );

  const agentDisplayNames = createAgentDisplayNames(agents);

  // Portfolio Analytics: Check for backtest results or historical data
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  // Get backtest results from agent data (where they're actually stored)
  const backtestResults = backtestAgent?.backtestResults || [];
  const hasBacktestData = backtestResults.length > 0;

  // Filter backtest results by selected period
  const filteredBacktestData = useMemo(() => {
    if (!hasBacktestData) return [];
    
    if (selectedPeriod === 'all') {
      return backtestResults;
    }
    
    const now = new Date();
    const periodDays: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    
    const days = periodDays[selectedPeriod];
    if (!days) return backtestResults;
    
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return backtestResults.filter((result: any) => {
      const resultDate = new Date(result.date);
      return resultDate >= cutoffDate;
    });
  }, [backtestResults, selectedPeriod, hasBacktestData]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Investment Report</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="analyst-signals">Analyst Signals</TabsTrigger>
            <TabsTrigger value="analytics">Portfolio Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-8 my-4">
            {/* Summary Section */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Recommended trading actions based on analyst signals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickers.map(ticker => {
                      const decision = outputNodeData.decisions[ticker];
                      const currentPrice = outputNodeData.current_prices?.[ticker] || 'N/A';
                      return (
                        <TableRow key={ticker}>
                          <TableCell className="font-medium">{ticker}</TableCell>
                          <TableCell>${typeof currentPrice === 'number' ? currentPrice.toFixed(2) : currentPrice}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(decision.action as ActionType)}
                              <span className="capitalize">{decision.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>{decision.quantity}</TableCell>
                          <TableCell>{getConfidenceBadge(decision.confidence)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
          </TabsContent>

          <TabsContent value="analyst-signals" className="space-y-8 my-4">
            {/* Analyst Signals Section */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Analyst Signals</h2>
              <Accordion type="multiple" className="w-full">
                {tickers.map(ticker => (
                  <AccordionItem key={ticker} value={ticker}>
                    <AccordionTrigger className="text-base font-medium px-4 py-3 bg-muted/30 rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {ticker}
                        <div className="flex items-center gap-1">
                          {getActionIcon(outputNodeData.decisions[ticker].action as ActionType)}
                          <span className="text-sm font-normal text-muted-foreground">
                            {outputNodeData.decisions[ticker].action} {outputNodeData.decisions[ticker].quantity} shares
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-1">
                      <div className="space-y-4">
                        {/* Agent Signals */}
                        <div className="grid grid-cols-1 gap-4">
                          {agents.map(agent => {
                            const signal = outputNodeData.analyst_signals[agent]?.[ticker];
                            if (!signal) return null;

                            return (
                              <Card key={agent} className="overflow-hidden">
                                <CardHeader className="bg-muted/50 pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">
                                      {agentDisplayNames.get(agent) || agent}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                      {getSignalBadge(signal.signal)}
                                      {getConfidenceBadge(signal.confidence)}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-3">
                                  {typeof signal.reasoning === 'string' ? (
                                    <p className="text-sm whitespace-pre-line">
                                      {signal.reasoning}
                                    </p>
                                  ) : (
                                    <div className="max-h-48 overflow-y-auto bg-muted/30">
                                      <SyntaxHighlighter
                                        language="json"
                                        style={vscDarkPlus}
                                        className="text-sm rounded-md"
                                        customStyle={{
                                          fontSize: '0.875rem',
                                          margin: 0,
                                          padding: '12px',
                                          backgroundColor: 'hsl(var(--muted))',
                                        }}
                                      >
                                        {JSON.stringify(signal.reasoning, null, 2)}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8 my-4">
            {/* Portfolio Analytics Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Portfolio Analytics</h2>
                {hasBacktestData && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Period:</label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="text-sm p-1.5 rounded bg-background border border-border cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last 90 Days</option>
                      <option value="1y">Last Year</option>
                    </select>
                  </div>
                )}
              </div>
              
              {hasBacktestData ? (
                filteredBacktestData.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                      <CardDescription>
                        Portfolio performance for the selected period
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Performance Summary */}
                        {filteredBacktestData.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">Total Periods</div>
                              <div className="text-lg font-semibold">{filteredBacktestData.length}</div>
                            </div>
                            {filteredBacktestData.length > 1 && (() => {
                              const first = filteredBacktestData[0];
                              const last = filteredBacktestData[filteredBacktestData.length - 1];
                              const totalReturn = ((last.portfolio_value - first.portfolio_value) / first.portfolio_value) * 100;
                              return (
                                <>
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground mb-1">Initial Value</div>
                                    <div className="text-lg font-semibold">${first.portfolio_value.toLocaleString()}</div>
                                  </div>
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground mb-1">Final Value</div>
                                    <div className="text-lg font-semibold">${last.portfolio_value.toLocaleString()}</div>
                                  </div>
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground mb-1">Total Return</div>
                                    <div className={`text-lg font-semibold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Performance Table */}
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Portfolio Value</TableHead>
                                <TableHead>Cash</TableHead>
                                <TableHead>Return</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredBacktestData.map((result: any, idx: number) => {
                                const prevValue = idx > 0 ? filteredBacktestData[idx - 1].portfolio_value : result.portfolio_value;
                                const periodReturn = ((result.portfolio_value - prevValue) / prevValue) * 100;
                                
                                return (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{result.date}</TableCell>
                                    <TableCell>${result.portfolio_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell>${result.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className={periodReturn >= 0 ? 'text-green-500' : 'text-red-500'}>
                                      {periodReturn >= 0 ? '+' : ''}{periodReturn.toFixed(2)}%
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center text-muted-foreground">
                        No data available for this period.
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      No data available for this period.
                      <p className="text-sm mt-2">Run a backtest to see portfolio analytics.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}