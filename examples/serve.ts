import Router from "../src/Router.ts"
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

await serve(await new Router({ root: import.meta.resolve("./.") }))