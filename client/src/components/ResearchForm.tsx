import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import LoadingQuotes from "./LoadingQuotes";

const formSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
});

interface ResearchFormProps {
  onSubmit: (topic: string) => Promise<void>;
  isLoading: boolean;
}

export default function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values.topic);
    form.reset();
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
              <FormControl>
                <Input 
                  placeholder="Enter your research topic..."
                  className="text-lg p-6"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
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
