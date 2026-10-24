const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname;
http.createServer((req,res)=>{
let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});
}).listen(4188,'127.0.0.1',()=>console.log('http://127.0.0.1:4188'));
