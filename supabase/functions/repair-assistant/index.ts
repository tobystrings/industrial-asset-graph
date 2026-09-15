import {createRepairHandler} from './handler.ts';
Deno.serve(createRepairHandler(name=>Deno.env.get(name)));
