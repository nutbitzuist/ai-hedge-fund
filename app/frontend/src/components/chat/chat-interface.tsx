import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatApi } from '@/services/chat-api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to AI Hedge Fund! Ask me about any stock ticker, for example: "Analyze AAPL" or "What do you think about MSFT and GOOGL?"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create a streaming message for the assistant response
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      let fullResponse = '';
      let currentStatus = 'Analyzing...';
      let currentAnalysis = '';

      const cancel = chatApi.analyze(
        userMessage.content,
        (event) => {
          if (event.type === 'start') {
            currentStatus = 'Starting analysis...';
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: currentStatus }
                  : msg
              )
            );
          } else if (event.type === 'progress') {
            currentStatus = event.status || 'Processing...';
            if (event.analysis) {
              currentAnalysis = event.analysis;
            }
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: `${currentStatus}\n${currentAnalysis ? `\n${currentAnalysis}` : ''}` }
                  : msg
              )
            );
          } else if (event.type === 'complete') {
            const decisions = event.data?.decisions || {};
            const analystSignals = event.data?.analyst_signals || {};
            
            // Format the response
            let responseText = 'Analysis Complete!\n\n';
            
            if (Object.keys(decisions).length > 0) {
              responseText += 'Trading Decisions:\n';
              for (const [ticker, decision] of Object.entries(decisions)) {
                if (typeof decision === 'object' && decision !== null) {
                  const dec = decision as any;
                  responseText += `\n${ticker}:\n`;
                  if (dec.action) responseText += `  Action: ${dec.action}\n`;
                  if (dec.quantity) responseText += `  Quantity: ${dec.quantity}\n`;
                  if (dec.reasoning) responseText += `  Reasoning: ${dec.reasoning}\n`;
                } else {
                  responseText += `\n${ticker}: ${decision}\n`;
                }
              }
            }
            
            if (Object.keys(analystSignals).length > 0) {
              responseText += '\n\nAnalyst Signals:\n';
              for (const [analyst, signals] of Object.entries(analystSignals)) {
                responseText += `\n${analyst}:\n`;
                if (typeof signals === 'object' && signals !== null) {
                  for (const [ticker, signal] of Object.entries(signals)) {
                    const sig = signal as any;
                    responseText += `  ${ticker}: ${sig.signal || sig.action || 'N/A'}\n`;
                    if (sig.confidence) responseText += `    Confidence: ${sig.confidence}\n`;
                  }
                }
              }
            }

            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: responseText, isStreaming: false }
                  : msg
              )
            );
            setIsLoading(false);
          } else if (event.type === 'error') {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: `Error: ${event.message}`, isStreaming: false }
                  : msg
              )
            );
            setIsLoading(false);
          }
        },
        (error) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: `Error: ${error.message}`, isStreaming: false }
                : msg
            )
          );
          setIsLoading(false);
        }
      );

      // Store cancel function for cleanup if needed
      return () => {
        if (cancel) cancel();
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: `Error: ${errorMessage}`, isStreaming: false }
            : msg
        )
      );
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Hedge Fund Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role !== 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {message.role === 'system' ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )}
                
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.role === 'system'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  {message.isStreaming && (
                    <Loader2 className="h-4 w-4 animate-spin mt-2" />
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about stocks (e.g., 'Analyze AAPL' or 'What about MSFT and GOOGL?')"
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
}

