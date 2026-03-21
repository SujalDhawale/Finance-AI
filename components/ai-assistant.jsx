"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot } from "lucide-react";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm your Welth AI Assistant. How can I help you manage your finances today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.text })
      });
      const data = await res.json();
      
      setMessages((prev) => [...prev, { role: "ai", text: data.text || "Sorry, I encountered an error." }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", text: "Something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 z-50"
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
      </Button>

      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-80 md:w-96 shadow-2xl z-50 flex flex-col h-[500px] border-2 border-blue-100">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg py-3 flex flex-row items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle className="text-md font-medium">Welth AI Assistant</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg p-3 text-sm flex gap-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-3 border-t">
            <form onSubmit={sendMessage} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 focus-visible:ring-blue-600"
                disabled={isLoading}
              />
              <Button type="submit" disabled={!input.trim() || isLoading} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
