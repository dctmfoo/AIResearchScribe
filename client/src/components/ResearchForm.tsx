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
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
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
        setInterimTranscript("");
        finalTranscriptRef.current = "";
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
    if (isListening) {
      // If we're still supposed to be listening, restart recognition
      startRecognition();
    } else {
      setIsListening(false);
      setIsInitializing(false);
      setInterimTranscript("");
      // Set the final accumulated transcript to the form
      form.setValue('topic', finalTranscriptRef.current.trim(), { shouldValidate: true });
    }
  }, [form, isListening]);

  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported');
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;  // Enable continuous recognition
    recognition.interimResults = true;  // Enable interim results
    recognition.lang = 'en-US';

    recognition.addEventListener('end', handleRecognitionEnd);
    return recognition;
  }, [handleRecognitionEnd]);

  const startRecognition = useCallback(async () => {
    setIsInitializing(true);
    finalTranscriptRef.current = form.getValues('topic'); // Preserve existing text

    try {
      if (!recognitionRef.current) {
        recognitionRef.current = initializeSpeechRecognition();
      }

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setIsInitializing(false);
        toast({
          title: "Listening...",
          description: "Speak your research topic. Click the microphone again to stop.",
        });
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += ' ' + transcript;
            // Update form with accumulated final transcript
            form.setValue('topic', finalTranscriptRef.current.trim(), { shouldValidate: true });
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update interim transcript for visual feedback
        setInterimTranscript(interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsInitializing(false);
        setInterimTranscript("");

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
      setInterimTranscript("");
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
      setInterimTranscript("");
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
                <div className="flex-1 relative">
                  <FormControl>
                    <Input 
                      placeholder="Enter your research topic..."
                      className="text-lg p-6"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  {interimTranscript && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center px-4 animate-pulse">
                      <p className="text-muted-foreground">{interimTranscript}</p>
                    </div>
                  )}
                </div>
                {speechSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={`flex-shrink-0 transition-all duration-200 ${
                      isListening ? 'bg-destructive hover:bg-destructive/90 ring-2 ring-destructive ring-offset-2' : ''
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
