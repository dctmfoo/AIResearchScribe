import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, MicOff } from "lucide-react";
import LoadingQuotes from "./LoadingQuotes";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
});

interface ResearchFormProps {
  onSubmit: (topic: string) => Promise<void>;
  isLoading: boolean;
}

export default function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
    },
  });

  useEffect(() => {
    // Check if browser supports speech recognition
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(supported);
    
    if (!supported) {
      console.warn('Speech recognition is not supported in this browser');
    }
  }, []);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values.topic);
    form.reset();
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak your research topic",
      });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      form.setValue('topic', transcript, { shouldValidate: true });
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast({
        title: "Error",
        description: "Failed to recognize speech. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-serif">Research Topic</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input 
                    placeholder="Enter your research topic..."
                    className="text-lg p-6"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                {speechSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={toggleSpeechRecognition}
                    disabled={isLoading}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4 text-destructive animate-pulse" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {isListening ? "Stop listening" : "Start voice input"}
                    </span>
                  </Button>
                )}
              </div>
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Article...
            </span>
          ) : (
            "Generate Research Article"
          )}
        </Button>
        
        {isLoading && (
          <div className="mt-8">
            <LoadingQuotes />
          </div>
        )}
      </form>
    </Form>
  );
}

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
