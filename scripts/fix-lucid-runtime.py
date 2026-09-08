#!/usr/bin/env python3
import urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/Snetchy09/LucidOS/3c1179e2f01bc3573d228ff51dac68258c6c70f6/apps/lucid-script-runtime.js"
OUT = Path(__file__).resolve().parents[1] / "apps" / "lucid-script-runtime.js"

print("Downloading known-good runtime...")
src = urllib.request.urlopen(URL, timeout=30).read().decode()
print(f"Downloaded {len(src)} bytes")

repls = [
    ('return{type:"return",value:this.evaluate(node.value,env)}case"expression"',
     'return{type:"return",value:this.evaluate(node.value,env)};case"expression"'),
    ('return o}case"unary"',
     'return o};case"unary"'),
    ('return o==null?undefined:o[node.property]}case"index"',
     'return o==null?undefined:o[node.property]};case"index"'),
    ('return o==null?undefined:o[i]}case"call"',
     'return o==null?undefined:o[i]};case"call"'),
    ('return this.applyBinary(node.operator,left,this.evaluate(node.right,env))}case"member"',
     'return this.applyBinary(node.operator,left,this.evaluate(node.right,env))};case"member"'),
    ('parseExpressionUntilBlock(){return this.parseExpression({stopAtNewline:false})}',
     'parseExpressionUntilBlock(){return this.parseExpression({stopAtNewline:false,stopAtBlock:true})}'),
    ('parseUnary(options){const t=this.current();if(t.type==="operator"&&(t.value==="!"||t.value==="-")){this.advance();return{type:"unary",operator:t.value,value:this.parseUnary(options),line:t.line}}return this.parsePrimary()}',
     'parseUnary(options){const t=this.current();if(t.type==="operator"&&(t.value==="!"||t.value==="-")){this.advance();return{type:"unary",operator:t.value,value:this.parseUnary(options),line:t.line}}return this.parsePrimary(options)}'),
    ('parsePrimary(){const t=this.current();',
     'parsePrimary(options={}){const t=this.current();'),
    ('if(this.matchSymbol("{")){const props=[];while(!this.check("symbol","}")){const k=this.expectIdentifier("Expected an object property name.");this.expectSymbol(":");props.push({key:k.value,value:this.parseExpression({stopAtNewline:true})});if(!this.matchSymbol(","))this.skipNewlines()}this.expectSymbol("}");return{type:"object",properties:props,line:t.line}}',
     'if(!options.stopAtBlock&&this.matchSymbol("{")){const props=[];while(!this.check("symbol","}")){const k=this.expectIdentifier("Expected an object property name.");this.expectSymbol(":");props.push({key:k.value,value:this.parseExpression({stopAtNewline:true})});if(!this.matchSymbol(","))this.skipNewlines()}this.expectSymbol("}");return{type:"object",properties:props,line:t.line}}'),
    ('parsePropertyBlock(){this.skipNewlines();this.expectSymbol("{");const properties=[];while(!this.check("symbol","}")){const name=this.expectIdentifier("Expected a property name.");properties.push({name:name.value,value:this.parseExpressionLine()});this.skipNewlines()}this.expectSymbol("}");return properties}',
     'parsePropertyBlock(){this.skipNewlines();this.expectSymbol("{");const properties=[];this.skipNewlines();while(!this.check("symbol","}")){const name=this.expectIdentifier("Expected a property name.");properties.push({name:name.value,value:this.parseExpressionLine()});this.skipNewlines()}this.expectSymbol("}");return properties}'),
    ('case"game":return{type:"game",children:this.parseGameBlock(t.line),line:t.line};',
     'case"game":{this.skipNewlines();if(this.check("symbol","{"))return{type:"game",children:this.parseGameBlock(t.line),line:t.line};return{type:"expression",expression:this.parseExpressionAfterIdentifier(c),line:t.line}}'),
    ('case"window":return{type:"window",children:this.parseRequiredBlock(t.line),line:t.line};',
     'case"window":{this.skipNewlines();if(this.check("symbol","{"))return{type:"window",children:this.parseRequiredBlock(t.line),line:t.line};return{type:"expression",expression:this.parseExpressionAfterIdentifier(c),line:t.line}}'),
]

for old, new in repls:
    if old not in src:
        raise SystemExit("Missing pattern: " + old[:60])
    src = src.replace(old, new)

OUT.write_text(src)
print(f"Wrote fixed runtime to {OUT} ({len(src)} bytes)")
print("Done. Run: git add apps/lucid-script-runtime.js && git commit -m 'Fix Lucid Script parser' && git push")
