import { useEffect, useState } from "react";

const ACADEMIC_QUOTES = [
  {
    quote: "The important thing is not to stop questioning. Curiosity has its own reason for existence.",
    author: "Albert Einstein"
  },
  {
    quote: "Research is to see what everybody else has seen, and to think what nobody else has thought.",
    author: "Albert Szent-Györgyi"
  },
  {
    quote: "The more I learn, the more I realize how much I don't know.",
    author: "Isaac Newton"
  },
  {
    quote: "Science is not only compatible with spirituality; it is a profound source of spirituality.",
    author: "Carl Sagan"
  },
  {
    quote: "Education is not the learning of facts, but the training of the mind to think.",
    author: "Albert Einstein"
  }
];

export default function LoadingQuotes() {
  const [currentQuote, setCurrentQuote] = useState(ACADEMIC_QUOTES[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(ACADEMIC_QUOTES[Math.floor(Math.random() * ACADEMIC_QUOTES.length)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center space-y-4 animate-fade-in">
      <div className="text-xl font-serif italic">"{currentQuote.quote}"</div>
      <div className="text-sm text-muted-foreground">— {currentQuote.author}</div>
    </div>
  );
}
