import type { infer as ZodInfer, ZodTypeAny } from 'zod'

export interface ToolDefinition<
  TInputSchema extends ZodTypeAny,
  TOutputSchema extends ZodTypeAny | undefined = undefined,
> {
  name: string
  title?: string
  description: string
  schema: TInputSchema
  outputSchema?: TOutputSchema
  handler: (input: ZodInfer<TInputSchema>) => Promise<unknown> | unknown
}

export function createTool<
  TInputSchema extends ZodTypeAny,
  TOutputSchema extends ZodTypeAny | undefined = undefined,
>(tool: ToolDefinition<TInputSchema, TOutputSchema>) {
  return tool
}
