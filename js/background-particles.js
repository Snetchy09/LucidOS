const field=document.getElementById("background-particles");
if(field){
for(let i=0;i<30;i++){
const star=document.createElement("span");
star.className="background-particle";
star.style.left=String(Math.random()*100)+"%";
star.style.top=String(Math.random()*100)+"%";
star.style.setProperty("--size",(Math.random()>.88?2:1)+"px");
star.style.setProperty("--drift",(Math.random()*24-12)+"px");
star.style.setProperty("--bright",String(.12+Math.random()*.35));
star.style.animationDelay=String(Math.random()*15)+"s";
star.style.animationDuration=String(14+Math.random()*18)+"s";
field.appendChild(star);
}
console.log("LucidOS: stars are up.");
}