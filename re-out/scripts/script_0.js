/* Pelican Pedal - tiny, purpose-built WebGL 2 renderer. No runtime dependencies. */
'use strict';
window.PP = window.PP || {};
(() => {
  const M = {};
  M.identity = () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  M.mul = (a,b,out=new Float32Array(16)) => {
    for(let c=0;c<4;c++) for(let r=0;r<4;r++) out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    return out;
  };
  M.compose = (p,r,s) => {
    const [x,y,z]=r, a=Math.cos(x),b=Math.sin(x),c=Math.cos(y),d=Math.sin(y),e=Math.cos(z),f=Math.sin(z);
    return new Float32Array([(c*e)*s[0],(a*f+b*d*e)*s[0],(b*f-a*d*e)*s[0],0,(-c*f)*s[1],(a*e-b*d*f)*s[1],(b*e+a*d*f)*s[1],0,d*s[2],-b*c*s[2],a*c*s[2],0,...p,1]);
  };
  M.perspective = (fov,aspect,near,far) => {
    const f=1/Math.tan(fov/2),nf=1/(near-far);
    return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);
  };
  M.ortho = (l,r,b,t,n,f) => new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);
  const norm = v => { const d=Math.hypot(...v)||1; return v.map(x=>x/d); };
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  M.lookAt = (eye,target,up=[0,1,0]) => {
    const z=norm(eye.map((v,i)=>v-target[i])), x=norm(cross(up,z)), y=cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  };
  M.invert = a => {
    const o=new Float32Array(16),a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    let d=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06; if(!d)return M.identity(); d=1/d;
    o[0]=(a11*b11-a12*b10+a13*b09)*d;o[1]=(a02*b10-a01*b11-a03*b09)*d;o[2]=(a31*b05-a32*b04+a33*b03)*d;o[3]=(a22*b04-a21*b05-a23*b03)*d;
    o[4]=(a12*b08-a10*b11-a13*b07)*d;o[5]=(a00*b11-a02*b08+a03*b07)*d;o[6]=(a32*b02-a30*b05-a33*b01)*d;o[7]=(a20*b05-a22*b02+a23*b01)*d;
    o[8]=(a10*b10-a11*b08+a13*b06)*d;o[9]=(a01*b08-a00*b10-a03*b06)*d;o[10]=(a30*b04-a31*b02+a33*b00)*d;o[11]=(a21*b02-a20*b04-a23*b00)*d;
    o[12]=(a11*b07-a10*b09-a12*b06)*d;o[13]=(a00*b09-a01*b07+a02*b06)*d;o[14]=(a31*b01-a30*b03-a32*b00)*d;o[15]=(a20*b03-a21*b01+a22*b00)*d;
    return o;
  };
  const color = hex => { if(Array.isArray(hex))return hex; if(typeof hex==='string')hex=parseInt(hex.replace('#',''),16); return [(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255,1]; };
  let nextId=0;
  class Geometry {
    constructor(p,n){this.id=nextId++;this.positions=new Float32Array(p);this.normals=new Float32Array(n);this.count=p.length/3;}
  }
  const meshFromTriangles = tris => {const p=[],n=[];for(const [a,b,c] of tris){const normal=norm(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i])));p.push(...a,...b,...c);n.push(...normal,...normal,...normal);}return new Geometry(p,n);};
  const G={};
  G.box=()=>{
    const v=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],f=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]],t=[];
    for(const a of f)t.push([v[a[0]],v[a[1]],v[a[2]]],[v[a[0]],v[a[2]],v[a[3]]]);return meshFromTriangles(t);
  };
  G.sphere=(w=12,h=8,flat=false)=>{
    const p=[],n=[],pt=(i,j)=>{const a=i/w*Math.PI*2,b=j/h*Math.PI;return [Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];};
    const tris=[];for(let j=0;j<h;j++)for(let i=0;i<w;i++){const a=pt(i,j),b=pt(i+1,j),c=pt(i+1,j+1),d=pt(i,j+1);if(j>0)tris.push([a,b,d]);if(j<h-1)tris.push([b,c,d]);}
    if(flat)return meshFromTriangles(tris);for(const t of tris)for(const v of t){p.push(...v);n.push(...v);}return new Geometry(p,n);
  };
  G.cylinder=(segments=12,top=1,bottom=1)=>{
    const t=[];for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,A=[Math.cos(a)*bottom,-.5,Math.sin(a)*bottom],B=[Math.cos(b)*bottom,-.5,Math.sin(b)*bottom],C=[Math.cos(b)*top,.5,Math.sin(b)*top],D=[Math.cos(a)*top,.5,Math.sin(a)*top];t.push([A,D,B],[B,D,C]);if(top)t.push([[0,.5,0],C,D]);if(bottom)t.push([[0,-.5,0],A,B]);}return meshFromTriangles(t);
  };
  G.torus=(major=.6,minor=.08,segments=24,rings=7)=>{
    const p=[],n=[],pt=(i,j)=>{const a=i/segments*Math.PI*2,b=j/rings*Math.PI*2;return {p:[minor*Math.sin(b),(major+minor*Math.cos(b))*Math.cos(a),(major+minor*Math.cos(b))*Math.sin(a)],n:[Math.sin(b),Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a)]};};
    for(let i=0;i<segments;i++)for(let j=0;j<rings;j++){const a=pt(i,j),b=pt(i+1,j),c=pt(i+1,j+1),d=pt(i,j+1);for(const v of [a,b,d,b,c,d]){p.push(...v.p);n.push(...v.n);}}return new Geometry(p,n);
  };
  G.plane=(size=1,steps=1)=>{
    const p=[],n=[];for(let i=0;i<steps;i++)for(let j=0;j<steps;j++){const x=i/steps*size-size/2,z=j/steps*size-size/2,d=size/steps;for(const v of [[x,0,z],[x,0,z+d],[x+d,0,z],[x+d,0,z],[x,0,z+d],[x+d,0,z+d]]){p.push(...v);n.push(0,1,0);}}return new Geometry(p,n);
  };
  G.wedge=()=>meshFromTriangles([
    [[-.5,0,.5],[.5,0,.5],[0,0,-.5]], [[-.5,0,.5],[0,0,-.5],[0,.35,.3]], [[.5,0,.5],[0,.35,.3],[0,0,-.5]], [[-.5,0,.5],[0,.35,.3],[.5,0,.5]]
  ]);
  class Node {
    constructor(geo=null,c=0xffffff){this.geo=geo;this.color=color(c);this.pos=[0,0,0];this.rot=[0,0,0];this.scale=[1,1,1];this.children=[];this.visible=true;this.cast=true;this.mode=0;this.world=M.identity();}
    add(...nodes){this.children.push(...nodes);return this;}
    at(x,y,z){this.pos=[x,y,z];return this;}
    size(x,y=x,z=x){this.scale=[x,y,z];return this;}
    turn(x,y=0,z=0){this.rot=[x,y,z];return this;}
  }
  const vertex=`#version 300 es
  precision highp float;precision highp int;
  layout(location=0) in vec3 aPosition; layout(location=1) in vec3 aNormal;
  layout(location=2) in mat4 aModel; layout(location=6) in vec4 aColor;
  uniform mat4 uVP;uniform mat4 uLightVP;uniform float uTime;uniform int uMode;
  out vec3 vWorld;out vec3 vNormal;out vec4 vColor;out vec4 vShadow;
  void main(){vec4 w=aModel*vec4(aPosition,1.);mat3 basis=mat3(aModel);vec3 n=normalize(basis*(aNormal/vec3(dot(basis[0],basis[0]),dot(basis[1],basis[1]),dot(basis[2],basis[2]))));
    if(uMode==1){float a=w.x*.15+w.z*.07+uTime*.8,b=w.z*.28-uTime*.7;w.y+=sin(a)*.13+sin(b)*.06;n=normalize(vec3(-cos(a)*.0195,1.,-cos(a)*.0091-cos(b)*.0168));}
    vWorld=w.xyz;vNormal=n;vColor=aColor;vShadow=uLightVP*w;gl_Position=uVP*w;}
  `;
  const fragment=`#version 300 es
  precision highp float;precision highp int;
  in vec3 vWorld;in vec3 vNormal;in vec4 vColor;in vec4 vShadow;
  uniform vec3 uEye,uFog,uSky,uLightDir;uniform sampler2D uShadow;uniform float uTime,uNight;uniform bool uShadows;uniform int uMode;
  out vec4 frag;
  float shadow(vec3 normal){if(!uShadows||uMode==1||uMode==2)return 1.;vec3 s=vShadow.xyz/vShadow.w*.5+.5;if(s.x<0.||s.x>1.||s.y<0.||s.y>1.||s.z>1.)return 1.;float bias=max(.0018*(1.-dot(normal,uLightDir)),.0006);float r=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float dep=texture(uShadow,s.xy+vec2(x,y)/1536.).r;r+=s.z-bias>dep?.43:1.;}return r/9.;}
  void main(){vec3 n=normalize(vNormal);float diff=max(dot(n,uLightDir),0.);float sh=shadow(n);vec3 base=vColor.rgb;vec3 hemi=mix(vec3(.46,.49,.49),vec3(.95,1.,1.02),n.y*.5+.5);vec3 col=base*(hemi*(.6-uNight*.19)+vec3(1.15,.96,.77)*diff*sh*(.67-uNight*.38));
    vec3 view=normalize(uEye-vWorld),halfV=normalize(uLightDir+view);float spec=pow(max(dot(n,halfV),0.),40.);
    if(uMode==1){float fr=pow(1.-max(dot(n,view),0.),3.);col=mix(base*(.78+diff*.23),uSky,fr*.55);float waves=sin(vWorld.x*1.7+sin(vWorld.z*.3+uTime)*2.5+uTime)*sin(vWorld.z*2.1-uTime*.5);col+=smoothstep(.89,1.,waves)*.085;col+=vec3(1.,.82,.5)*pow(max(dot(reflect(-uLightDir,n),view),0.),150.)*.9;}
    if(uMode==2)col=base;
    if(uMode==3)col=base*(1.12+spec*.9);
    if(uMode==4){float stripe=step(.5,fract((vWorld.x+vWorld.y)*3.));col=mix(col,vec3(.17,.23,.24),stripe*.72);}
    float dist=length(vWorld-uEye);float fog=1.-exp(-pow(dist*.0062,1.65));col=mix(col,uFog,clamp(fog,0.,.98));
    col=col/(col*.18+.91);frag=vec4(col,vColor.a);}
  `;
  const depthV=`#version 300 es
  precision highp float;precision highp int;layout(location=0) in vec3 aPosition;layout(location=2) in mat4 aModel;uniform mat4 uVP;void main(){gl_Position=uVP*aModel*vec4(aPosition,1.);}`;
  const depthF=`#version 300 es
  precision highp float;precision highp int;void main(){}`;
  const skyV=`#version 300 es
  precision highp float;precision highp int;out vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,1.,1.);}`;
  const skyF=`#version 300 es
  precision highp float;precision highp int;in vec2 vUV;uniform mat4 uInverseVP;uniform vec3 uEye,uTop,uHorizon,uSunDir;uniform float uNight,uTime;out vec4 frag;
  float hash(vec2 v){return fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);}
  void main(){vec4 w=uInverseVP*vec4(vUV*2.-1.,1.,1.);vec3 ray=normalize(w.xyz/w.w-uEye);float h=max(ray.y,0.);vec3 col=mix(uHorizon,uTop,pow(h,.65));float sun=max(dot(ray,uSunDir),0.);col+=vec3(1.,.67,.24)*pow(sun,35.)*.28*(1.-uNight);col=mix(col,vec3(1.,.92,.66),smoothstep(.9981,.9987,sun)*(1.-uNight));
    vec2 uv=vec2(atan(ray.x,ray.z)*.159+0.5,asin(ray.y)*.636)*vec2(520.,260.);vec2 cell=floor(uv);float star=step(.991,hash(cell))*pow(max(0.,1.-length(fract(uv)-.5)*2.4),5.);col+=star*uNight*smoothstep(.015,.3,ray.y)*(sin(uTime*.9+hash(cell)*20.)*.3+.7);frag=vec4(col,1.);}
  `;
  class Renderer {
    constructor(canvas){
      this.canvas=canvas;const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('此浏览器未能创建 WebGL 2 上下文。请开启硬件加速，或使用新版 Chrome、Edge、Firefox、Safari。');this.gl=gl;
      this.program=this.compile(vertex,fragment);this.depthProgram=this.compile(depthV,depthF);this.skyProgram=this.compile(skyV,skyF);this.gpu=new Map();this.batches=new Map();this.shadowSize=1536;this.shadows=true;
      this.shadowTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      this.shadowFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)this.shadows=false;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      this.lightDir=norm([-0.55,1,.5]);this.lightVP=M.mul(M.ortho(-26,26,-32,32,.1,150),M.lookAt([-35,57,20],[0,0,-14]));this.calls=0;gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
    }
    compile(v,f){const gl=this.gl,p=gl.createProgram();for(const [type,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
    uni(p,name,type,value){const gl=this.gl,loc=gl.getUniformLocation(p,name);if(loc===null)return;if(type==='m')gl.uniformMatrix4fv(loc,false,value);else if(type==='3')gl.uniform3fv(loc,value);else if(type==='1')gl.uniform1f(loc,value);else gl.uniform1i(loc,value);}
    resize(w,h,ratio=1){this.canvas.width=Math.round(w*ratio);this.canvas.height=Math.round(h*ratio);this.width=w;this.height=h;}
    getGPU(geo,key){const gl=this.gl;if(this.gpu.has(key))return this.gpu.get(key);const vao=gl.createVertexArray();gl.bindVertexArray(vao);for(const [idx,data] of [[0,geo.positions],[1,geo.normals]]){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(idx);gl.vertexAttribPointer(idx,3,gl.FLOAT,false,0,0);}const inst=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,inst);for(let i=0;i<4;i++){gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,80,i*16);gl.vertexAttribDivisor(2+i,1);}gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,4,gl.FLOAT,false,80,64);gl.vertexAttribDivisor(6,1);const gpu={vao,inst,count:geo.count};this.gpu.set(key,gpu);return gpu;}
    collect(node,parent){if(!node.visible)return;const w=M.mul(parent,M.compose(node.pos,node.rot,node.scale));node.world=w;if(node.geo){const key=node.geo.id+'_'+node.mode+'_'+(node.cast?1:0);let b=this.batches.get(key);if(!b){b={key,geo:node.geo,mode:node.mode,cast:node.cast,data:[],count:0};this.batches.set(key,b);}b.data.push(...w,...node.color);b.count++;}for(const child of node.children)this.collect(child,w);}
    render(root,camera,env,time){
      const gl=this.gl;this.calls=0;this.batches.clear();this.collect(root,M.identity());const projection=M.perspective(camera.fov*Math.PI/180,this.width/this.height,.1,420),view=M.lookAt(camera.eye,camera.target),vp=M.mul(projection,view);
      for(const b of this.batches.values()){b.gpu=this.getGPU(b.geo,b.key);gl.bindBuffer(gl.ARRAY_BUFFER,b.gpu.inst);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(b.data),gl.DYNAMIC_DRAW);}
      if(this.shadows){gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFB);gl.viewport(0,0,this.shadowSize,this.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.depthProgram);this.uni(this.depthProgram,'uVP','m',this.lightVP);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.3,2.8);for(const b of this.batches.values())if(b.cast&&b.mode!==1&&b.mode!==2){gl.bindVertexArray(b.gpu.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,b.geo.count,b.count);this.calls++;}gl.disable(gl.POLYGON_OFFSET_FILL);}
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(this.skyProgram);gl.bindVertexArray(null);
      this.uni(this.skyProgram,'uInverseVP','m',M.invert(vp));this.uni(this.skyProgram,'uEye','3',camera.eye);this.uni(this.skyProgram,'uTop','3',env.top);this.uni(this.skyProgram,'uHorizon','3',env.fog);this.uni(this.skyProgram,'uSunDir','3',env.sun);this.uni(this.skyProgram,'uNight','1',env.night);this.uni(this.skyProgram,'uTime','1',time);gl.drawArrays(gl.TRIANGLES,0,3);
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.useProgram(this.program);this.uni(this.program,'uVP','m',vp);this.uni(this.program,'uLightVP','m',this.lightVP);this.uni(this.program,'uEye','3',camera.eye);this.uni(this.program,'uFog','3',env.fog);this.uni(this.program,'uSky','3',env.top);this.uni(this.program,'uLightDir','3',this.lightDir);this.uni(this.program,'uTime','1',time);this.uni(this.program,'uNight','1',env.night);this.uni(this.program,'uShadows','i',this.shadows?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);this.uni(this.program,'uShadow','i',0);
      for(const b of this.batches.values()){this.uni(this.program,'uMode','i',b.mode);gl.bindVertexArray(b.gpu.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,b.geo.count,b.count);this.calls++;}gl.bindVertexArray(null);
    }
  }
  PP.M=M;PP.G=G;PP.Node=Node;PP.Renderer=Renderer;PP.color=color;PP.norm=norm;PP.lerp=(a,b,t)=>a+(b-a)*t;PP.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
})();