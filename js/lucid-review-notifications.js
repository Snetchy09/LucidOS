import { getCurrentUser,getOwnSubmissions } from "./lucid-store-api.js";
const KEY="lucid-review-notification-state";
let timer=null;
function notify(message){let box=document.querySelector(".lucid-script-notifications");if(!box){box=document.createElement("div");box.className="lucid-script-notifications";document.body.appendChild(box)}const item=document.createElement("div");item.className="lucid-script-notification";item.textContent=message;box.appendChild(item);setTimeout(()=>item.remove(),4500)}
function readState(){try{return JSON.parse(localStorage.getItem(KEY))||{lastCheckAt:0,seen:{}}}catch{return{lastCheckAt:0,seen:{}}}}
function saveState(value){localStorage.setItem(KEY,JSON.stringify(value))}
async function check(){const user=await getCurrentUser();if(!user)return;try{const submissions=await getOwnSubmissions();const current=readState();const now=Date.now();for(const item of submissions){if(!item.id)continue;const status=item.status||"pending";const reviewedAt=item.reviewed_at?Date.parse(item.reviewed_at):0;const previous=current.seen[item.id];if(status!=="pending"&&((previous&&previous!==status)||(reviewedAt&&reviewedAt>current.lastCheckAt))){if(status==="approved")notify(`Lucid Store approved “${item.name}”.`);else if(status==="rejected")notify(`Lucid Store rejected “${item.name}”.${item.rejection_reason?` ${item.rejection_reason}`:""}`)}current.seen[item.id]=status}current.lastCheckAt=now;saveState(current)}catch(error){console.warn("Lucid review notifications:",error)}}
function start(){clearInterval(timer);check();timer=setInterval(check,30000)}
window.addEventListener("load",start);
export {start};