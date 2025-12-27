declare module 'minimist' {
  const minimist: (args: string[], opts?: any) => any
  export default minimist
}

declare module '@pcontext/api' {
  const api: {
    port?: number
    fetch: (req: Request) => Response | Promise<Response>
  }
  export default api
}
