const field=document.getElementById("background-particles");
if(field){
for(let i=0;i<24;i++){
const particle=document.createElement("span");
particle.className="background-particle";
particle.style.left=`${Math.random()*100}%`;
particle.style.top=`${Math.random()*100}%`;
particle.style.setProperty("--drift",`${Math.random()*24-12}px`);
particle.style.animationDelay=`${Math.random()*12}s`;
particle.style.animationDuration=`${10+Math.random()*14}s`;
field.appendChild(particle);
}
console.log("Background particles are ready.");
}