import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, MicOff } from "lucide-react";
import LoadingQuotes from "./LoadingQuotes";
import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
});

interface ResearchFormProps {
  onSubmit: (topic: string) => Promise<void>;
  isLoading: boolean;
}

// Speech recognition error types
type SpeechRecognitionErrorType = 
  | 'not-supported' 
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'aborted'
  | 'init-failed'
  | 'unknown';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
    },
  });

  const checkSpeechRecognition = useCallback(() => {
    const hasNativeSpeechRecognition = 'SpeechRecognition' in window;
    const hasWebkitSpeechRecognition = 'webkitSpeechRecognition' in window;
    return hasNativeSpeechRecognition || hasWebkitSpeechRecognition;
  }, []);

  useEffect(() => {
    const supported = checkSpeechRecognition();
    setSpeechSupported(supported);
    
    if (!supported) {
      console.warn('Speech recognition is not supported in this browser');
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition. Please try using a modern browser like Chrome.",
        variant: "destructive",
      });
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          recognitionRef.current.removeEventListener('end', handleRecognitionEnd);
          recognitionRef.current = null;
        } catch (error) {
          console.error('Error cleaning up speech recognition:', error);
        }
        setIsListening(false);
        setIsInitializing(false);
      }
    };
  }, [checkSpeechRecognition, toast]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values.topic);
    form.reset();
  };

  const getErrorMessage = (error: SpeechRecognitionErrorType): string => {
    switch (error) {
      case 'not-supported':
        return "Speech recognition is not supported in your browser. Please try using Chrome.";
      case 'network':
        return "Network connection error. Please check your internet connection.";
      case 'no-speech':
        return "No speech was detected. Please try speaking again.";
      case 'audio-capture':
        return "No microphone was found. Please check your microphone settings.";
      case 'not-allowed':
        return "Microphone access was denied. Please allow microphone access in your browser settings.";
      case 'service-not-allowed':
        return "Speech recognition service is not allowed. Please try again later.";
      case 'bad-grammar':
        return "Speech recognition grammar error. Please try again.";
      case 'language-not-supported':
        return "The selected language is not supported. Using English (US).";
      case 'aborted':
        return "Speech recognition was stopped.";
      case 'init-failed':
        return "Failed to initialize speech recognition. Please refresh the page.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const handleRecognitionEnd = useCallback(() => {
    setIsListening(false);
    setIsInitializing(false);
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported');
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.addEventListener('end', handleRecognitionEnd);
    return recognition;
  }, [handleRecognitionEnd]);

  const startRecognition = useCallback(async () => {
    setIsInitializing(true);

    try {
      if (!recognitionRef.current) {
        recognitionRef.current = initializeSpeechRecognition();
      }

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setIsInitializing(false);
        toast({
          title: "Listening...",
          description: "Speak your research topic clearly",
        });
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        form.setValue('topic', transcript, { shouldValidate: true });
        setIsListening(false);
        setRetryCount(0);
        toast({
          title: "Got it!",
          description: "Successfully captured your research topic.",
        });
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsInitializing(false);

        const errorType = event.error as SpeechRecognitionErrorType;
        const errorMessage = getErrorMessage(errorType);

        if (errorType === 'network' && retryCount < MAX_RETRIES) {
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
          setRetryCount(0);
        }
      };

      await recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
      setIsInitializing(false);
      toast({
        title: "Error",
        description: getErrorMessage('init-failed'),
        variant: "destructive",
      });
    }
  }, [form, initializeSpeechRecognition, retryCount, toast]);

  const toggleSpeechRecognition = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
      setRetryCount(0);
      toast({
        title: "Stopped",
        description: "Speech recognition stopped",
      });
      return;
    }

    startRecognition();
  }, [isListening, startRecognition, toast]);

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
                    className={`flex-shrink-0 transition-colors duration-200 ${
                      isListening ? 'bg-destructive hover:bg-destructive/90' : ''
                    }`}
                    onClick={toggleSpeechRecognition}
                    disabled={isLoading || isInitializing}
                  >
                    {isInitializing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isListening ? (
                      <MicOff className="h-4 w-4 text-destructive-foreground animate-pulse" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {isInitializing 
                        ? "Initializing..."
                        : isListening 
                          ? "Stop listening" 
                          : "Start voice input"}
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
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
