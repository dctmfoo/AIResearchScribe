import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, MicOff } from "lucide-react";
import LoadingQuotes from "./LoadingQuotes";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
});

interface ResearchFormProps {
  onSubmit: (topic: string) => Promise<void>;
  isLoading: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
        setIsListening(false);
      }
    };
  }, []);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values.topic);
    form.reset();
  };

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'network':
        return "Network connection error. Please check your internet connection.";
      case 'no-speech':
        return "No speech was detected. Please try again.";
      case 'audio-capture':
        return "No microphone was found. Please check your microphone settings.";
      case 'not-allowed':
        return "Microphone permission was denied. Please allow microphone access.";
      case 'aborted':
        return "Speech recognition was aborted.";
      default:
        return "An error occurred during speech recognition. Please try again.";
    }
  };

  const startRecognition = () => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak your research topic",
      });
    };

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      form.setValue('topic', transcript, { shouldValidate: true });
      setIsListening(false);
      setRetryCount(0); // Reset retry count on successful recognition
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      const errorMessage = getErrorMessage(event.error);

      // Handle network errors with retry mechanism
      if (event.error === 'network' && retryCount < MAX_RETRIES) {
        toast({
          title: "Network Error",
          description: `Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
          variant: "destructive",
        });
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          startRecognition();
        }, RETRY_DELAY);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        setRetryCount(0); // Reset retry count after max retries or different error
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast({
        title: "Error",
        description: "Failed to start speech recognition. Please try again.",
        variant: "destructive",
      });
      setIsListening(false);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
      setRetryCount(0);
      return;
    }

    startRecognition();
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
