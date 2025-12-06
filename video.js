const video = document.getElementById("myVideo");
const videoBox = document.getElementById("videoBox");
const overlayPlay = document.getElementById("overlayPlay");
const playBtn = document.getElementById("playBtn");
const controls = document.getElementById("controls");
const progress = document.getElementById("progress");
const hoverProgress = document.getElementById("hoverProgress");
const bufferedBar = document.getElementById("bufferedBar");
const progressContainer = document.getElementById("progressContainer");
const timeDisplay = document.getElementById("time");
const volumeBtn = document.getElementById("volumeBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const skipContainer = document.getElementById("skipContainer");
const skipCountdown = document.getElementById("skipCountdown");
const loadingOverlay = document.getElementById("loadingOverlay");

const vastTagUrls = ["https://moistwar.com/dMm/F.zRdPG/NSvhZ/GxU-/seemX9huUZkU/lMkcPiTVYq3LMAjcAE5/NHjQEptXN/j/cHylMwDMks2/MFgz"]; // Multiple Ads Support

// --- State ---
let isAdPlaying=false, adLoaded=false, currentAdIndex=0;
let impressionUrls=[], trackingEvents={}, clickTrackingUrls=[], adClickThrough="";
let quartile25=false, quartile50=false, quartile75=false, quartile100=false;

// --- Tracking function ---
function fireTracking(urls){ if(!urls||!Array.isArray(urls)) return; urls.forEach(url=>{ if(url&&url.trim()){ new Image().src=url.trim()+"&t="+Date.now(); } }); }

// --- Fetch VAST ---
async function fetchVast(url){
    try{
        const resp = await fetch(url+"?t="+Date.now());
        const xml = new DOMParser().parseFromString(await resp.text(),"application/xml");
        const mediaFile = xml.querySelector("MediaFile");
        if(mediaFile) video.dataset.adSrc = mediaFile.textContent.trim();
        const clickThrough = xml.querySelector("ClickThrough");
        if(clickThrough) adClickThrough = clickThrough.textContent.trim();
        xml.querySelectorAll("ClickTracking").forEach(ct=>clickTrackingUrls.push(ct.textContent.trim()));
        xml.querySelectorAll("Impression").forEach(imp=>impressionUrls.push(imp.textContent.trim()));
        xml.querySelectorAll("Tracking").forEach(event=>{
            const eventName = event.getAttribute("event");
            const url = event.textContent.trim();
            if(eventName && url){
                if(!trackingEvents[eventName]) trackingEvents[eventName]=[];
                trackingEvents[eventName].push(url);
            }
        });
        adLoaded=true;
    } catch(err){ console.error("VAST Error:",err); fireTracking([`/adFail?t=${Date.now()}`]); }
}

// --- Start Ad ---
function startAd(){
    isAdPlaying=true;
    video.src = video.dataset.adSrc;
    video.load();
    video.addEventListener("canplaythrough", onAdCanPlay, {once:true});
}

// --- Ad can play ---
function onAdCanPlay(){
    loadingOverlay.style.display="none";
    fireTracking(impressionUrls);
    fireTracking(trackingEvents["start"]);
    video.play();
    startSkipCountdown();
    resetQuartileFlags();
}

// --- Reset quartiles ---
function resetQuartileFlags(){ quartile25=quartile50=quartile75=quartile100=false; }

// --- Video timeupdate tracking ---
video.addEventListener("timeupdate",()=>{
    if(!isAdPlaying || isNaN(video.duration)) return;
    const p = video.currentTime/video.duration;
    if(p>=0.25&&!quartile25){quartile25=true; fireTracking(trackingEvents["firstQuartile"]);}
    if(p>=0.50&&!quartile50){quartile50=true; fireTracking(trackingEvents["midpoint"]);}
    if(p>=0.75&&!quartile75){quartile75=true; fireTracking(trackingEvents["thirdQuartile"]);}
    if(p>=0.98&&!quartile100){quartile100=true; fireTracking(trackingEvents["complete"]);}
});

// --- Skip Ad countdown ---
function startSkipCountdown(){
    let t=5;
    skipContainer.style.display="block";
    skipCountdown.innerText=`Skip Ad in ${t}`;
    const interval=setInterval(()=>{
        t--;
        if(t>0){ skipCountdown.innerText=`Skip Ad in ${t}`; }
        else{
            skipCountdown.innerText="Skip Ad";
            skipCountdown.style.background="rgba(255,255,255,0.9)";
            skipCountdown.style.color="#000";
            skipCountdown.style.cursor="pointer";
            skipCountdown.onclick=()=>{ clearInterval(interval); skipContainer.style.display="none"; loadMainVideo(); };
            clearInterval(interval);
        }
    },1000);
}

// --- Load Main Video ---
function loadMainVideo(){
    isAdPlaying=false;
    video.src=mainVideoSrc;
    video.load();
    loadingOverlay.style.display="flex";
    loadingOverlay.querySelector("div:last-child").innerText="Loading Video...";
    video.addEventListener("canplaythrough",()=>{
        loadingOverlay.style.display="none";
        video.play();
        controls.classList.add("show");
    },{once:true});
}

// --- Toggle Play ---
function togglePlay(){ if(video.paused){video.play(); overlayPlay.classList.add("hide"); playBtn.innerHTML='<i class="fa-solid fa-pause"></i>'; } else{ video.pause(); overlayPlay.classList.remove("hide"); playBtn.innerHTML='<i class="fa-solid fa-play"></i>'; } }
videoBox.addEventListener("click",(e)=>{ if(!e.target.closest(".controls")&&!e.target.closest("#skipContainer")) togglePlay(); });
volumeBtn.addEventListener("click",()=>{ video.muted=!video.muted; volumeBtn.innerHTML=video.muted?'<i class="fa-solid fa-volume-xmark"></i>':'<i class="fa-solid fa-volume-high"></i>'; });
fullscreenBtn.addEventListener("click",()=>{ if(videoBox.requestFullscreen) videoBox.requestFullscreen(); });

// --- Progress & time ---
video.addEventListener("timeupdate",()=>{
    if(video.duration){
        progress.style.width=(video.currentTime/video.duration*100)+"%";
        const fmt=t=>`${String(Math.floor(t/60)).padStart(2,"0")}:${String(Math.floor(t%60)).padStart(2,"0")}`;
        timeDisplay.innerText=`${fmt(video.currentTime)} / ${fmt(video.duration)}`;
    }
});
video.addEventListener("progress",()=>{ if(video.buffered.length>0){ bufferedBar.style.width=(video.buffered.end(video.buffered.length-1)/video.duration*100)+"%"; } });
progressContainer.addEventListener("click",(e)=>{ const r=progressContainer.getBoundingClientRect(); video.currentTime=(e.clientX-r.left)/r.width*video.duration; });
progressContainer.addEventListener("mousemove",(e)=>{ const r=progressContainer.getBoundingClientRect(); hoverProgress.style.width=((e.clientX-r.left)/r.width*100)+"%"; });
progressContainer.addEventListener("mouseleave",()=>hoverProgress.style.width="0%");

// --- Advanced Play button logic ---
overlayPlay.onclick=playBtn.onclick=()=>{
    overlayPlay.classList.add("hide");
    loadingOverlay.style.display="flex";
    loadingOverlay.querySelector("div:last-child").innerText="Loading Video...";

    // 10s grace period
    let timeout=setTimeout(()=>{
        if(!adLoaded) loadMainVideo();
    },10000);

    // Try to play first Ad
    fetchVast(vastTagUrls[currentAdIndex]).then(()=>{
        clearTimeout(timeout);
        if(adLoaded && video.dataset.adSrc) startAd();
        else loadMainVideo();
    }).catch(()=>{ clearTimeout(timeout); loadMainVideo(); });
};

// --- Video end ---
video.addEventListener("ended",()=>{
    if(isAdPlaying){ fireTracking(trackingEvents["complete"]); loadMainVideo(); } 
    else { overlayPlay.classList.remove("hide"); playBtn.innerHTML='<i class="fa-solid fa-play"></i>'; }
});

// --- Controls auto hide ---
let hideTimer;
function showControls(){ if(!isAdPlaying) controls.classList.add("show"); clearTimeout(hideTimer); hideTimer=setTimeout(()=>{ if(!isAdPlaying && !video.paused) controls.classList.remove("show"); },3000);}
videoBox.addEventListener("mousemove",showControls);
videoBox.addEventListener("touchstart",showControls);
showControls();
