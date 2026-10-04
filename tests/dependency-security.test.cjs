const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const path=require('node:path');
const grpc=require('@grpc/grpc-js');
const undici=require('undici');
test('patched gRPC preserves server/client request and response APIs',async()=>{
 const codec={serialize:x=>Buffer.from(JSON.stringify(x)),deserialize:x=>JSON.parse(x.toString())};
 const methods={hello:{path:'/probe.Service/Hello',requestStream:false,responseStream:false,requestSerialize:codec.serialize,requestDeserialize:codec.deserialize,responseSerialize:codec.serialize,responseDeserialize:codec.deserialize}};
 const server=new grpc.Server();server.addService(methods,{hello:(call,callback)=>callback(null,{message:'hello '+call.request.name})});
 const port=await new Promise((resolve,reject)=>server.bindAsync('127.0.0.1:0',grpc.ServerCredentials.createInsecure(),(error,port)=>error?reject(error):resolve(port)));
 const Client=grpc.makeGenericClientConstructor(methods,'Probe');const client=new Client('127.0.0.1:'+port,grpc.credentials.createInsecure());
 try{const response=await new Promise((resolve,reject)=>client.hello({name:'compatibility'},(error,value)=>error?reject(error):resolve(value)));assert.equal(response.message,'hello compatibility');}
 finally{client.close();await new Promise(resolve=>server.tryShutdown(resolve));}
});
test('patched Undici preserves local HTTP request/body APIs',async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}));});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const agent=new undici.Agent();try{const response=await undici.request('http://127.0.0.1:'+server.address().port,{dispatcher:agent});assert.equal(response.statusCode,200);assert.deepEqual(await response.body.json(),{ok:true});}
 finally{await agent.close();await new Promise(resolve=>server.close(resolve));}
});
test('Next-compatible PostCSS and TypeScript parser minimatch still transform/match',async()=>{
 const postcss=require(require.resolve('postcss',{paths:[path.dirname(require.resolve('next/package.json'))]}));
 const result=await postcss([{postcssPlugin:'compatibility',Declaration(decl){if(decl.prop==='color')decl.value='blue';}}]).process('a { color: red; }',{from:undefined});assert.match(result.css,/color: blue/);
 const minimatch=require(require.resolve('minimatch',{paths:[path.dirname(require.resolve('@typescript-eslint/typescript-estree/package.json'))]}));assert.equal(minimatch.minimatch('src/example.ts','src/*.{ts,tsx}'),true);assert.equal(minimatch.minimatch('src/example.css','src/*.{ts,tsx}'),false);
});
