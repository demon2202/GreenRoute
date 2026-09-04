import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY;

/* eslint-disable no-undef */
/* global isTrackingGPS setIsTrackingGPS gpsRouteCoordinates setGPSRouteCoordinates toggleGPSTracking */


/* ═══════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
═══════════════════════════════════════════════════════════ */
const MODE_META = {
  walking: {
    color:'#4A7C59',
    label:'Walk',
    desc:'Zero emissions',
    bg:'#EAF1EB',
    co2PerKm:0,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="4" r="2"/>
        <path d="m15 7-3 4-2-2-4 3"/>
        <path d="m6 16 3-2 3 5 4-3"/>
      </svg>
    ),
    mapIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="m14 12-1-2-3-1-3 3M4 18l4-2v-4M9 13v-3h3l2.5 3M12 16v5M15 21v-4l-2-2"/></svg>`
  },
  cycling: {
    color:'#2563EB',
    label:'Cycle',
    desc:'Fast & green',
    bg:'#EFF6FF',
    co2PerKm:0.021,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <circle cx="15" cy="5" r="1"/>
        <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    ),
    mapIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5 1-4.5 2-2.5h3.5M12 17.5 8 13.5l3-3.5 1 2"/></svg>`
  },
  driving: {
    color:'#D97706',
    label:'Drive',
    desc:'Door to door',
    bg:'#FEF3C7',
    co2PerKm:0.21,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.8 6 10.5 6H8.2C7.5 6 7 6.5 7 7.2v3.3C7 11.2 7.5 11.7 8.2 11.7h1.6c.7 0 1.2-.5 1.2-1.2V9M2 17h10c1.1 0 2-.9 2-2V9"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    ),
    mapIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.8 6 10.5 6H8.2C7.5 6 7 6.5 7 7.2v3.3C7 11.2 7.5 11.7 8.2 11.7h1.6c.7 0 1.2-.5 1.2-1.2V9M2 17h10c1.1 0 2-.9 2-2V9"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`
  },
  transit: {
    color:'#7C3AED',
    label:'Transit',
    desc:'Shared & affordable',
    bg:'#F5F3FF',
    co2PerKm:0.089,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="16" rx="2" ry="2"/>
        <path d="M6 6h12v4H6ZM6 14h2v2H6ZM16 14h2v2h-2ZM8 19v2M16 19v2"/>
      </svg>
    ),
    mapIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2" ry="2"/><path d="M6 6h12v4H6ZM6 14h2v2H6ZM16 14h2v2h-2ZM8 19v2M16 19v2"/></svg>`
  },
};

/* SVG direction arrows — no emoji, consistent cross-platform */
function DirectionArrow({ type, modifier, size = 22, color = 'currentColor' }) {
  const s = { width: size, height: size, display: 'block' };
  const p = { fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const key = modifier ? `${type}-${modifier}` : type;
  switch (key) {
    case 'turn-right':        return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M6 18V8h8m0 0-4-4m4 4-4 4"/></svg>;
    case 'turn-left':         return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M18 18V8h-8m0 0 4-4m-4 4 4 4"/></svg>;
    case 'turn-slight-right': return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M6 18V10l6-6m0 0v4m0-4h-4"/></svg>;
    case 'turn-slight-left':  return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M18 18V10l-6-6m0 0v4m0-4h4"/></svg>;
    case 'turn-sharp-right':  return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M5 18V7h9m0 0-3-3m3 3-3 3"/></svg>;
    case 'turn-sharp-left':   return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M19 18V7h-9m0 0 3-3m-3 3 3 3"/></svg>;
    case 'roundabout':
    case 'rotary':            return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="5"/><path {...p} d="M12 4v3m7 5h-3"/></svg>;
    case 'merge':             return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 20V8m0 0L8 4m4 4 4-4M8 12l4-4 4 4"/></svg>;
    case 'fork-right':        return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 20v-8m0 0 5-5m-5 5V4"/></svg>;
    case 'fork-left':         return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 20v-8m0 0-5-5m5 5V4"/></svg>;
    case 'depart':            return <svg style={s} viewBox="0 0 24 24"><circle fill={color} cx="12" cy="12" r="4"/><path {...p} d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>;
    case 'arrive':            return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 20V4m0 0-4 4m4-4 4 4"/><rect fill={color} x="8" y="18" width="8" height="2" rx="1"/></svg>;
    case 'straight':
    case 'continue':          return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 20V4m0 0-4 4m4-4 4 4"/></svg>;
    default:                  return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 20V4m0 0-4 4m4-4 4 4"/></svg>;
  }
}

const CARBON_EQUIVALENTS = [
  { threshold:0.1, text:(kg)=>`🔋 ${Math.round(kg/0.008)}x phone charges`               },
  { threshold:0.5, text:(kg)=>`☕ ${Math.round(kg/0.021)} cups of coffee footprint`     },
  { threshold:1,   text:(kg)=>`🌳 ${(kg/21.7*365).toFixed(1)} days of tree absorption`  },
  { threshold:5,   text:(kg)=>`🏠 powering a home for ${Math.round(kg/0.9)} hrs`        },
  { threshold:999, text:(kg)=>`✈️ ${(kg/255).toFixed(2)} hrs of flight emissions saved` },
];

const KEYBOARD_SHORTCUTS = [
  { key:'Ctrl+Enter', desc:'Find routes' },
  { key:'Escape',     desc:'Clear / close' },
  { key:'Tab',        desc:'Cycle routes' },
  { key:'N',          desc:'Start navigation' },
  { key:'V',          desc:'Toggle voice' },
  { key:'T',          desc:'Toggle traffic' },
  { key:'S',          desc:'Toggle satellite' },
  { key:'?',          desc:'Show shortcuts' },
];

const SAVED_PLACES_KEY  = 'gr_saved_places';
const RECENT_ROUTES_KEY = 'gr_recent_routes';

function easeInOutCubic(t) { return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
function lerp(a,b,t) { return a+(b-a)*t; }
function interpolateRoute(coords,t) {
  if (!coords?.length) return [0,0];
  if (t<=0) return coords[0];
  if (t>=1) return coords[coords.length-1];
  const n=coords.length-1, i=Math.min(Math.floor(t*n),n-1), r=t*n-i;
  return [lerp(coords[i][0],coords[i+1][0],r), lerp(coords[i][1],coords[i+1][1],r)];
}
function getBearing(a,b) {
  const toR=d=>d*Math.PI/180, toD=r=>r*180/Math.PI;
  const dL=toR(b[0]-a[0]), la=toR(a[1]), lb=toR(b[1]);
  return (toD(Math.atan2(Math.sin(dL)*Math.cos(lb), Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dL)))+360)%360;
}
const getOrthoDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // meters
};
function formatDist(m) { return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(1)} km`; }
function formatDur(s)   { const m=Math.round(s/60); return m<60?`${m} min`:`${Math.floor(m/60)}h ${m%60}m`; }
function formatTime(date) { return date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }

function getEcoScore(route) {
  if (!route) return 0;
  const co2Score = Math.min((parseFloat(route.co2Saved) || 0) / 2 * 40, 40);
  const calScore = Math.min((route.calories || 0) / 300 * 30, 30);
  return Math.round(co2Score + calScore + 30);
}

function getCarbonEquivalent(kgSaved) {
  const eq = CARBON_EQUIVALENTS.find(e=>kgSaved<=e.threshold) || CARBON_EQUIVALENTS[CARBON_EQUIVALENTS.length-1];
  return { icon:'', text:eq.text(kgSaved) };
}

function getEcoScoreColor(score) {
  if (score>=75) return '#10b981';
  if (score>=50) return '#f59e0b';
  return '#ef4444';
}

function makePinSVG(label, color) {
  const light = lightenColor(color);
  return `<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="ps${label}" x="-40%" y="-10%" width="180%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.32)"/>
      </filter>
      <radialGradient id="pg${label}" cx="38%" cy="32%" r="62%">
        <stop offset="0%" stop-color="${light}"/>
        <stop offset="100%" stop-color="${color}"/>
      </radialGradient>
    </defs>
    <path d="M18 2C10.3 2 4 8.3 4 16c0 10.5 14 30 14 30S32 26.5 32 16C32 8.3 25.7 2 18 2z"
      fill="url(#pg${label})" filter="url(#ps${label})"/>
    <ellipse cx="13" cy="11" rx="4" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-20,13,11)"/>
    <text x="18" y="20" text-anchor="middle" dominant-baseline="middle"
      font-family="-apple-system,sans-serif" font-size="13" font-weight="800" fill="#fff">${label}</text>
  </svg>`;
}

function lightenColor(hex) {
  const n=parseInt(hex.slice(1),16);
  const r=Math.min(255,((n>>16)&0xff)+55), g=Math.min(255,((n>>8)&0xff)+55), b=Math.min(255,(n&0xff)+55);
  return `rgb(${r},${g},${b})`;
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

/* Eco Score Ring */
const EcoRing = ({ score, size=44 }) => {
  const r=16, c=2*Math.PI*r, color=getEcoScoreColor(score);
  const fill = (score/100)*c;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{flexShrink:0}}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3.5"/>
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeLinecap="round" strokeDasharray={`${fill} ${c}`}
        style={{transform:'rotate(-90deg)',transformOrigin:'50% 50%',transition:'stroke-dasharray 0.6s ease'}}/>
      <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>{score}</text>
    </svg>
  );
};

/* CO2 Comparison Chart */
const Co2Chart = ({ routes, selectedMode }) => {
  if (!routes?.length) return null;
  const maxCo2 = Math.max(...routes.map(r=>parseFloat(r.co2Saved)||0), 0.1);
  return (
    <div style={{padding:'14px 16px',background:'var(--bg-primary, #f8fafc)',borderRadius:16,border:'1px solid var(--border-color)',marginTop:8,marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontSize:11,fontWeight:800,color:'var(--text-muted, #94a3b8)',textTransform:'uppercase',letterSpacing:'0.06em'}}>
          Relative Carbon Savings
        </span>
        <span style={{fontSize:11,fontWeight:700,color:'#10b981',background:'rgba(16,185,129,0.1)',padding:'2px 8px',borderRadius:20}}>
          Telemetry
        </span>
      </div>
      {routes.map((r,i) => {
        const m = MODE_META[r.mode]||{};
        const val = parseFloat(r.co2Saved)||0;
        const pct = (val/maxCo2)*100;
        const isSel = r.mode===selectedMode;
        return (
          <div key={i} style={{marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <div style={{width:10,height:10,borderRadius:3,background:m.color,flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:700,color:isSel?m.color:'var(--text-secondary, #64748b)',flex:1}}>{m.label}</span>
              <span style={{fontSize:12,fontWeight:800,color:m.color}}>+{val.toFixed(2)} kg CO₂</span>
            </div>
            <div style={{height:8,background:'var(--border-color, #e2e8f0)',borderRadius:999,overflow:'hidden'}}>
              <div style={{
                height:'100%', width:'100%',
                background:`linear-gradient(90deg,${m.color},${lightenColor(m.color)})`,
                borderRadius:999,
                transform: `scaleX(${pct / 100})`,
                transformOrigin: 'left',
                transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isSel?`0 0 10px ${m.color}66`:undefined,
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* Elevation Profile */
const ElevationProfile = ({ data, color='#10b981' }) => {
  if (!data?.length) return null;
  const W=320, H=60, pad=4;
  const minEl=Math.min(...data), maxEl=Math.max(...data);
  const range=maxEl-minEl||1;
  const pts = data.map((el,i)=>{
    const x=pad+((W-2*pad)/(data.length-1))*i;
    const y=H-pad-((el-minEl)/range)*(H-2*pad);
    return `${x},${y}`;
  }).join(' ');
  const area = `M${pad},${H-pad} L${pts.split(' ').join(' L')} L${W-pad},${H-pad} Z`;
  const totalGain = data.reduce((acc,el,i)=>i>0&&el>data[i-1]?acc+(el-data[i-1]):acc,0);
  const totalLoss = data.reduce((acc,el,i)=>i>0&&el<data[i-1]?acc+(data[i-1]-el):acc,0);
  return (
    <div style={{padding:'10px 12px',background:'var(--bg-primary, #f8fafc)',borderRadius:12,marginTop:8}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <span style={{fontSize:11,fontWeight:700,color:'var(--text-muted, #94a3b8)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Elevation Profile</span>
        <div style={{display:'flex',gap:10}}>
          <span style={{fontSize:11,color:'#10b981',fontWeight:600}}>↑ {Math.round(totalGain)}m</span>
          <span style={{fontSize:11,color:'#ef4444',fontWeight:600}}>↓ {Math.round(totalLoss)}m</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:'block'}}>
        <defs>
          <linearGradient id="elGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.04"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#elGrad)"/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <text x={pad} y={H-1} fontSize="8" fill="var(--text-muted, #94a3b8)">{Math.round(minEl)}m</text>
        <text x={pad} y={10} fontSize="8" fill="var(--text-muted, #94a3b8)">{Math.round(maxEl)}m</text>
      </svg>
    </div>
  );
};

/* AQI Banner */
const AQIBanner = ({ aqi }) => {
  if (!aqi) return null;
  const levels = [
    { max:50,  color:'#10b981', label:'Good',            msg:'Great air quality for outdoor activity!' },
    { max:100, color:'#84cc16', label:'Moderate',         msg:'Acceptable air quality.' },
    { max:150, color:'#f59e0b', label:'Unhealthy (Sens)', msg:'Sensitive groups should limit outdoor exertion.' },
    { max:200, color:'#ef4444', label:'Unhealthy',        msg:'Everyone may experience health effects. Consider transit.' },
    { max:300, color:'#8b5cf6', label:'Very Unhealthy',   msg:'Avoid outdoor activity. Take transit or drive.' },
    { max:999, color:'#7f1d1d', label:'Hazardous',        msg:'Stay indoors! Extremely dangerous air quality.' },
  ];
  const level = levels.find(l=>aqi<=l.max)||levels[levels.length-1];
  return (
    <div style={{
      margin:'0 12px 10px',
      background:`color-mix(in srgb, ${level.color} 8%, var(--bg-secondary, #fff))`,
      border:`1.5px solid color-mix(in srgb, ${level.color} 25%, transparent)`,
      borderRadius:14, padding:'10px 14px',
      display:'flex', alignItems:'flex-start', gap:10,
    }}>
      <div style={{ width:32, height:32, borderRadius:9, background:level.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#fff' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{margin:'auto'}}>
          <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
          <path d="M12 8v4"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
      </div>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
          <span style={{fontSize:13,fontWeight:700,color:level.color}}>{level.label}</span>
          <span style={{fontSize:11,background:`color-mix(in srgb, ${level.color} 18%, transparent)`,color:level.color,padding:'1px 7px',borderRadius:20,fontWeight:700}}>AQI {aqi}</span>
        </div>
        <div style={{fontSize:12,color:'var(--text-secondary, #475569)'}}>{level.msg}</div>
      </div>
    </div>
  );
};

/* Nav Strip — Apple & Google Maps style floating bottom island */
const NavStrip = ({ route, progress, isNavigating, onStop, activeStep, onRecenter, voiceOn, onToggleVoice }) => {
  if (!isNavigating || !route) return null;
  const totalSec   = (route.duration || 0) * 60;
  const remaining  = Math.max(totalSec * (1 - progress), 0);
  const eta        = new Date(Date.now() + remaining * 1000);
  const distKm     = parseFloat(route.distance) || 0;
  const distLeft   = Math.max(distKm * (1 - progress), 0);
  const remMin     = Math.round(remaining / 60);

  const formattedEta = remMin < 60 
    ? `${remMin} min` 
    : `${Math.floor(remMin / 60)}h ${remMin % 60 < 10 ? '0' : ''}${remMin % 60}m`;

  const formattedDist = distLeft < 1 
    ? `${Math.round(distLeft * 1000)} m` 
    : `${distLeft.toFixed(1)} km`;

  return (
    <div style={{
      position: 'absolute',
      bottom: 18,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)',
      maxWidth: 580,
      zIndex: 200,
      animation: 'navStripIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <style>{`
        @keyframes navStripIn {
          from { opacity: 0; transform: translateX(-50%) translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        .nav-hud-card {
          background: rgba(18, 33, 24, 0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1.5px solid rgba(74, 222, 128, 0.35);
          border-radius: 24px;
          padding: 10px 14px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(74, 124, 89, 0.25);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #FFFFFF;
          box-sizing: border-box;
          width: 100%;
        }
        .nav-hud-left {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex-shrink: 0;
        }
        .nav-hud-eta {
          font-size: 1.45rem;
          font-weight: 800;
          color: #34D399;
          letter-spacing: -0.03em;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          white-space: nowrap;
          line-height: 1.1;
        }
        .nav-hud-dist {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          white-space: nowrap;
          margin-top: 2px;
        }
        .nav-hud-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 4px 10px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .nav-hud-arr-lbl {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 800;
          line-height: 1;
        }
        .nav-hud-arr-val {
          font-size: 0.9rem;
          font-weight: 800;
          color: #FFFFFF;
          white-space: nowrap;
          line-height: 1.2;
          margin-top: 1px;
        }
        .nav-hud-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .nav-btn-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .nav-btn-icon:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .nav-btn-end {
          padding: 7px 14px;
          border-radius: 999px;
          background: #DC2626;
          border: 1.5px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          font-weight: 800;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(220, 38, 38, 0.45);
          transition: all 0.15s ease;
          font-family: inherit;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .nav-btn-end:hover {
          background: #B91C1C;
          transform: scale(1.03);
        }
      `}</style>
      
      {/* Outer Shell (Double-Bezel) */}
      <div className="nav-hud-card">
        {/* Left: ETA and Time */}
        <div className="nav-hud-left">
          <span className="nav-hud-eta">{formattedEta}</span>
          <span className="nav-hud-dist">({formattedDist})</span>
        </div>

        {/* Center: Arrival Clock */}
        <div className="nav-hud-center">
          <span className="nav-hud-arr-lbl">Arrival</span>
          <span className="nav-hud-arr-val">{formatTime(eta)}</span>
        </div>

        {/* Right Actions */}
        <div className="nav-hud-actions">
          {/* Recenter Button */}
          <button
            onClick={onRecenter}
            title="Recenter Camera on Location"
            className="nav-btn-icon"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </button>

          {/* Voice Mute/Unmute */}
          <button
            onClick={onToggleVoice}
            title={voiceOn ? "Mute Voice Guidance" : "Unmute Voice Guidance"}
            className="nav-btn-icon"
            style={{
              background: voiceOn ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              borderColor: voiceOn ? 'rgba(74, 222, 128, 0.5)' : 'rgba(255, 255, 255, 0.15)',
              color: voiceOn ? '#4ADE80' : 'rgba(255, 255, 255, 0.7)'
            }}
          >
            {voiceOn ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            )}
          </button>

          {/* End Trip Button */}
          <button
            onClick={onStop}
            title="End Navigation"
            className="nav-btn-end"
          >
            <span style={{ display: 'inline-block', width: 7, height: 7, background: '#FFFFFF', borderRadius: 2 }} />
            <span>End</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* Floating turn card — shown on map during navigation */
const NavTurnCard = ({ step, nextStep, isNavigating, progress, totalSteps, voiceOn, onToggleVoice }) => {
  if (!isNavigating || !step) return null;
  const stepNum = Math.round(progress * totalSteps);
  return (
    <div style={{
      position: 'absolute',
      top: 14,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 190,
      width: 'calc(100% - 24px)',
      maxWidth: 520,
      animation: 'navCardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <style>{`
        @keyframes navCardIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        .nav-turn-outer {
          background: rgba(18, 33, 24, 0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 20px;
          border: 1.5px solid rgba(74, 222, 128, 0.35);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(52, 211, 153, 0.15);
          padding: 12px 16px;
          color: '#FFFFFF';
          display: flex;
          align-items: center;
          gap: 12px;
          box-sizing: border-box;
          width: 100%;
        }
        .nav-turn-ico-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          flex-shrink: 0;
          background: linear-gradient(135deg, rgba(74, 222, 128, 0.25) 0%, rgba(16, 185, 129, 0.1) 100%);
          border: 1.5px solid rgba(74, 222, 128, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(74, 222, 128, 0.2);
        }
        .nav-turn-info {
          flex: 1;
          min-width: 0;
        }
        .nav-turn-dist {
          font-size: 0.78rem;
          font-weight: 800;
          color: #4ADE80;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 2px;
          line-height: 1;
        }
        .nav-turn-inst {
          font-size: 1.05rem;
          font-weight: 800;
          line-height: 1.25;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nav-turn-next {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.65);
          font-weight: 500;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nav-turn-step-pill {
          flex-shrink: 0;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          font-size: 0.72rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.8);
        }
      `}</style>
      
      {/* Outer Shell */}
      <div className="nav-turn-outer">
        {/* Large Turn Arrow Box */}
        <div className="nav-turn-ico-box">
          <DirectionArrow type={step.type} modifier={step.modifier} size={28} color="#4ADE80" />
        </div>

        {/* Step Maneuver Text */}
        <div className="nav-turn-info">
          {step.distance > 0 && (
            <div className="nav-turn-dist">
              In {formatDist(step.distance)}
            </div>
          )}
          <div className="nav-turn-inst">
            {step.instruction}
          </div>
          {nextStep && (
            <div className="nav-turn-next">
              Then: {nextStep.instruction}
            </div>
          )}
        </div>

        {/* Step Progress Pill */}
        <div className="nav-turn-step-pill">
          {stepNum + 1}/{totalSteps}
        </div>
      </div>
    </div>
  );
};

/* Weekly Eco Report */
const EcoReport = ({ history, goal, onClose }) => {
  const now = new Date();
  const weekAgo = new Date(now - 7*24*3600*1000);
  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekly = history.filter(t=>new Date(t.date)>=weekAgo);
  const monthly = history.filter(t=>new Date(t.date)>=monthAgo);

  const stats = (trips) => ({
    co2:  trips.reduce((a,t)=>a+(parseFloat(t.co2Saved)||0),0),
    km:   trips.reduce((a,t)=>a+(parseFloat(t.distance)||0),0),
    cal:  trips.reduce((a,t)=>a+(t.calories||0),0),
    trips:trips.length,
    byMode: Object.fromEntries(Object.keys(MODE_META).map(m=>[m,trips.filter(t=>t.mode===m).length])),
  });

  const ws=stats(weekly), ms=stats(monthly);
  const driveCo2 = ms.km * 0.21;
  const saved    = driveCo2 - ms.co2;
  const grade    = ms.co2<goal*0.3?'A+':ms.co2<goal*0.5?'A':ms.co2<goal*0.7?'B+':ms.co2<goal?'B':'C';
  const gradeColor = grade.startsWith('A')?'#10b981':grade.startsWith('B')?'#f59e0b':'#ef4444';

  return (
    <div style={{
      position:'fixed',inset:0,
      background:'rgba(15,23,42,0.7)',
      backdropFilter:'blur(8px)',
      display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:9500,padding:20,
      animation:'fadeIn 0.2s ease',
    }}>
      <div style={{
        background:'var(--bg-secondary, #fff)',borderRadius:28,
        width:'100%',maxWidth:520,
        maxHeight:'88vh',overflowY:'auto',
        border:'1px solid var(--border-color)',
        boxShadow:'0 24px 60px rgba(0,0,0,0.25)',
        animation:'modalPop 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header */}
        <div style={{
          background:'linear-gradient(135deg,#064e3b,#065f46)',
          borderRadius:'28px 28px 0 0',
          padding:'28px 28px 24px',
          position:'relative',overflow:'hidden',
        }}>
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 60% at 80% 20%,rgba(52,211,153,0.15),transparent)',pointerEvents:'none'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div>
                <div style={{fontSize:11,color:'rgba(167,243,208,0.7)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Monthly Report</div>
                <div style={{fontSize:'1.6rem',fontWeight:800,color:'#fff',letterSpacing:'-0.03em'}}>Eco Impact Summary</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'3rem',fontWeight:900,color:gradeColor,lineHeight:1,fontFamily:'Outfit,sans-serif'}}>{grade}</div>
                <div style={{fontSize:11,color:'rgba(167,243,208,0.6)',fontWeight:600}}>Eco Grade</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              {[
                {val:`${ms.co2.toFixed(1)}kg`,lbl:'CO₂ Saved',col:'#4ade80'},
                {val:`${ms.km.toFixed(0)}km`, lbl:'Distance',  col:'#fff'},
                {val:ms.trips,                lbl:'Trips',     col:'#fff'},
              ].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,0.08)',borderRadius:14,padding:'12px 10px',textAlign:'center',border:'1px solid rgba(255,255,255,0.1)'}}>
                  <div style={{fontSize:'1.4rem',fontWeight:800,color:s.col,letterSpacing:'-0.03em',lineHeight:1}}>{s.val}</div>
                  <div style={{fontSize:10,color:'rgba(167,243,208,0.65)',marginTop:3,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{padding:'24px 28px'}}>

          {/* vs Driving */}
          <div style={{background:'var(--green-50)',border:'1px solid var(--border-color)',borderRadius:16,padding:'16px 18px',marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--primary)',marginBottom:8}}>vs. If You'd Driven Everything</div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>
                  <span>Your emissions</span><span style={{fontWeight:700,color:'#10b981'}}>{ms.co2.toFixed(1)} kg</span>
                </div>
                <div style={{height:8,background:'var(--bg-primary)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min((ms.co2/Math.max(driveCo2,0.1))*100,100)}%`,background:'#10b981',borderRadius:4}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-secondary)',marginTop:6}}>
                  <span>If driven</span><span style={{fontWeight:700,color:'#ef4444'}}>{driveCo2.toFixed(1)} kg</span>
                </div>
                <div style={{height:8,background:'var(--bg-primary)',borderRadius:4,overflow:'hidden',marginTop:4}}>
                  <div style={{height:'100%',width:'100%',background:'#ef4444',borderRadius:4}}/>
                </div>
              </div>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:'1.8rem',fontWeight:800,color:'#10b981',letterSpacing:'-0.04em'}}>{saved.toFixed(1)}</div>
                <div style={{fontSize:10,color:'#65a07c',fontWeight:600,textTransform:'uppercase'}}>kg saved</div>
              </div>
            </div>
          </div>

          {/* Mode breakdown */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Mode Breakdown</div>
            {Object.entries(MODE_META).map(([mode,m])=>{
              const count = ms.byMode[mode]||0;
              if (!count) return null;
              return (
                <div key={mode} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <div style={{width:10,height:10,borderRadius:3,background:m.color,flexShrink:0}}/>
                  <span style={{fontSize:13,color:'var(--text-secondary)',flex:1,fontWeight:500}}>{m.label}</span>
                  <div style={{width:100,height:6,background:'var(--bg-primary)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${(count/ms.trips)*100}%`,background:m.color,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:12,color:m.color,fontWeight:700,minWidth:24,textAlign:'right'}}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Fun stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
            {[
              { label:'tree absorption days', val:`${(ms.co2/21.7*365).toFixed(0)} days` },
              { label:'calories burned',       val:ms.cal.toLocaleString()               },
              { label:'phone charges avoided', val:`${Math.round(ms.co2/0.008)}`         },
              { label:`of ${goal}kg goal`,     val:`${Math.min(Math.round((ms.co2/goal)*100),100)}%` },
            ].map((s,i)=>(
              <div key={i} style={{background:'var(--bg-primary)',border:'1px solid var(--border-color)',borderRadius:14,padding:'14px 14px',textAlign:'center'}}>
                <div style={{fontSize:'1.1rem',fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em'}}>{s.val}</div>
                <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>

          <button onClick={onClose} style={{
            width:'100%',height:48,borderRadius:14,border:'none',
            background:'linear-gradient(135deg,#10b981,#059669)',
            color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',
            boxShadow:'0 4px 14px rgba(16,185,129,0.32)',
            fontFamily:'inherit',
          }}>Close Report</button>
        </div>
      </div>
    </div>
  );
};

/* Keyboard shortcuts modal */
const ShortcutsModal = ({ onClose }) => (
  <div style={{
    position:'fixed',inset:0,background:'rgba(15,23,42,0.6)',
    backdropFilter:'blur(6px)',display:'flex',alignItems:'center',
    justifyContent:'center',zIndex:9600,padding:20,
    animation:'fadeIn 0.2s ease',
  }}>
    <div style={{
      background:'var(--bg-secondary, #fff)',borderRadius:24,padding:28,
      width:'100%',maxWidth:380,
      border:'1px solid var(--border-color)',
      boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
      animation:'modalPop 0.25s ease',
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary, #0f172a)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>
          <h3 style={{fontSize:'1.1rem',fontWeight:800,color:'var(--text-primary, #0f172a)',margin:0}}>Keyboard Shortcuts</h3>
        </div>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',border:'1px solid var(--border-color)',background:'var(--bg-primary, #f1f5f9)',color:'var(--text-secondary, #64748b)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {KEYBOARD_SHORTCUTS.map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'var(--bg-primary, #f8fafc)',borderRadius:10}}>
            <span style={{fontSize:13,color:'var(--text-secondary, #475569)'}}>{s.desc}</span>
            <kbd style={{
              background:'var(--bg-secondary, #e2e8f0)',color:'var(--text-primary, #334155)',
              padding:'3px 9px',borderRadius:7,
              fontSize:12,fontWeight:700,
              border:'1px solid var(--border-color, #cbd5e1)',
              fontFamily:'monospace',
            }}>{s.key}</kbd>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* Recent Routes */
const RecentRoutes = ({ onSelect }) => {
  const [recent] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(RECENT_ROUTES_KEY)||'[]'); } catch { return []; }
  });
  if (!recent.length) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--bg-input, rgba(148, 163, 184, 0.12))', color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>No recent journeys</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
          Planned routes will automatically appear here for quick access.
        </div>
      </div>
    );
  }
  return (
    <div style={{padding:'8px 14px 0',flexShrink:0}}>
      <div style={{fontSize:10.5,fontWeight:700,color:'var(--text-muted, #94a3b8)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>
        Recent Journeys
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {recent.slice(0, 8).map((r,i)=>(
          <button key={i} onClick={()=>onSelect(r)} style={{
            display:'flex',alignItems:'center',gap:8,padding:'8px 10px',
            background:'var(--bg-primary, #f8fafc)',border:'1px solid var(--border-color, #e2e8f0)',borderRadius:11,
            cursor:'pointer',fontFamily:'inherit',textAlign:'left',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary, #4A7C59)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-color, #e2e8f0)'}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: 'var(--primary, #10b981)', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
            </span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:600,color:'var(--text-primary, #0f172a)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {r.originName?.split(',')[0]} → {r.destName?.split(',')[0]}
              </div>
              <div style={{fontSize:11,color:'var(--text-muted, #94a3b8)',marginTop:1}}>{r.mode} · {r.date}</div>
            </div>
            <span style={{fontSize:11,color:'#10b981',fontWeight:700,flexShrink:0}}>↗</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* Departure Time Picker */
const DepartureTime = ({ value, onChange }) => (
  <div style={{padding:'8px 14px 0',flexShrink:0}}>
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--bg-primary, #f8fafc)',border:'1px solid var(--border-color, #e2e8f0)',borderRadius:12}}>
      <span style={{fontSize:13}}>🕐</span>
      <span style={{fontSize:12,fontWeight:600,color:'var(--text-secondary, #475569)',whiteSpace:'nowrap'}}>Leave at</span>
      <input
        type="time"
        value={value}
        onChange={e=>onChange(e.target.value)}
        style={{flex:1,border:'none',background:'transparent',fontSize:13,fontWeight:700,color:'var(--text-primary, #0f172a)',outline:'none',cursor:'pointer'}}
      />
      {value && (
        <button onClick={()=>onChange('')} style={{border:'none',background:'none',color:'var(--text-muted, #94a3b8)',cursor:'pointer',fontSize:12}}>✕</button>
      )}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const RoutePlanner = ({ user }) => {
  /* ── Refs ── */
  const mapContainer   = useRef(null);
  const map            = useRef(null);
  const originGeoRef   = useRef(null);
  const destGeoRef     = useRef(null);
  const originMarker   = useRef(null);
  const destMarker     = useRef(null);
  const travMarker     = useRef(null);
  const animFrame      = useRef(null);
  const dashAnimFrame  = useRef(null);
  const animStart      = useRef(null);
  const animPausedAt   = useRef(null);
  const isStyleLoading = useRef(false);
  const speechRef      = useRef(null);
  const navStartTime   = useRef(null);
  const lastSpokenStep = useRef(-1);

  /* ── State ── */
  const [origin,        setOrigin]        = useState(null);
  const [destination,   setDestination]   = useState(null);
  const [routes,        setRoutes]        = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingPct,    setLoadingPct]    = useState(0);
  const [loadingStep,   setLoadingStep]   = useState(0);
  const [weather,       setWeather]       = useState(null);
  const [aqi,           setAqi]           = useState(null);
  const [carbon,        setCarbon]        = useState({ today:0,month:0,goal:60,pct:0 });
  const [history,       setHistory]       = useState([]);
  const [modes,         setModes]         = useState(['walking','cycling','transit','driving']);
  const [showModal,     setShowModal]     = useState(false);
  const [panel,         setPanel]         = useState('search');
  const [activeStep,    setActiveStep]    = useState(null);
  const [isNavigating,  setIsNavigating]  = useState(false);
  const [saveMsg,       setSaveMsg]       = useState('');
  const [mapStyle,      setMapStyle]      = useState('streets-v12');
  const [traffic,       setTraffic]       = useState(false);
  const [voiceOn,       setVoiceOn]       = useState(false);
  const [animProgress,  setAnimProgress]  = useState(0);
  const [isPlaying,     setIsPlaying]     = useState(true);
  const [animSpeed,     setAnimSpeed]     = useState(1);
  const [elevData,      setElevData]      = useState([]);
  const [showReport,    setShowReport]    = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [departureTime, setDepartureTime] = useState('');
  const [nightMode,     setNightMode]     = useState(false);
  const [mapSelectDestMode, setMapSelectDestMode] = useState(false);
  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const toggleGPSTracking = () => {
    setIsTrackingGPS(prev => !prev);
    if (isTrackingGPS) {
      setGPSRouteCoordinates(prev => [...prev]);
      setSaveMsg("GPS tracking stopped. Route saved.");
      setTimeout(() => setSaveMsg(""), 2500);
    } else {
      setSaveMsg("Starting GPS tracking...");
      setTimeout(() => setSaveMsg(""), 2500);
    }
  }

  const [sidebarTab, setSidebarTab] = useState('search');

  /* ── Sidebar resizer state ── */
  const [sidebarWidth, setSidebarWidth] = useState(440);
  const isResizing = useRef(false);

  /* ── GPS and Real Movement Verification state ── */
  const [useGPS, setUseGPS] = useState(true);
  const [distToDest, setDistToDest] = useState(null);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [completedTrip, setCompletedTrip] = useState(null);
  const [is3D, setIs3D] = useState(false);
  const userLiveLocation = useRef(null);
  const watchIdRef = useRef(null);
  const physicalTraveledKmRef = useRef(0);
  const lastGPSCoordRef = useRef(null);
  const isTripVerifiedRef = useRef(false);

  const activeStepRef = useRef(activeStep);
  useEffect(() => { activeStepRef.current = activeStep; }, [activeStep]);
  const selectedRouteRef = useRef(selectedRoute);
  useEffect(() => { selectedRouteRef.current = selectedRoute; }, [selectedRoute]);
  const voiceOnRef = useRef(voiceOn);
  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);
  const destinationRef = useRef(destination);
  useEffect(() => { destinationRef.current = destination; }, [destination]);
  const departureTimeRef = useRef(departureTime);
  useEffect(() => { departureTimeRef.current = departureTime; }, [departureTime]);
  const lastRecalculateTime = useRef(0);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = [longitude, latitude];
        userLiveLocation.current = coords;
        if (map.current) {
          map.current.flyTo({
            center: coords,
            zoom: 16.5,
            pitch: is3D ? 55 : 0,
            speed: 1.4,
            curve: 1.2
          });
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [is3D]);

  const toggle3D = useCallback(() => {
    if (!map.current) return;
    const next = !is3D;
    setIs3D(next);
    map.current.easeTo({
      pitch: next ? 55 : 0,
      duration: 800,
      easing: easeInOutCubic
    });
  }, [is3D]);

  const recenterCamera = useCallback(() => {
    if (!map.current) return;
    if (userLiveLocation.current) {
      map.current.easeTo({
        center: userLiveLocation.current,
        zoom: 17,
        pitch: 55,
        duration: 800
      });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          userLiveLocation.current = coords;
          map.current.easeTo({
            center: coords,
            zoom: 17,
            pitch: 55,
            duration: 800
          });
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleZoomIn = () => {
    if (map.current) map.current.zoomIn({ duration: 250 });
  };
  const handleZoomOut = () => {
    if (map.current) map.current.zoomOut({ duration: 250 });
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (map.current) {
      setTimeout(() => {
        try { map.current.resize(); } catch {}
      }, 150);
    }
  }, [isNavigating]);

  useEffect(() => {
    const handleResize = () => {
      if (map.current) {
        try { map.current.resize(); } catch {}
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCarbon = async()=>{
    try{
      const[h,p]=await Promise.all([axios.get('/api/history'),axios.get('/api/preferences')]);
      const goal=p.data?.monthlyGoal||60, now=new Date(), som=new Date(now.getFullYear(),now.getMonth(),1);
      let today=0,month=0;
      (h.data || []).forEach(t=>{const d=new Date(t.date),c=parseFloat(t.co2Saved)||0;if(d.toDateString()===now.toDateString())today+=c;if(d>=som)month+=c;});
      setCarbon({today,month,goal,pct:Math.min((month/goal)*100,100)});

      // Synchronize transport modes from user saved preferences
      if (p.data && Array.isArray(p.data.transportModes) && p.data.transportModes.length > 0) {
        const mappedModes = [];
        p.data.transportModes.forEach(tm => {
          const lower = (tm || '').toLowerCase();
          if (lower.includes('walk') && !mappedModes.includes('walking')) mappedModes.push('walking');
          if (lower.includes('cycl') && !mappedModes.includes('cycling')) mappedModes.push('cycling');
          if ((lower.includes('transit') || lower.includes('bus') || lower.includes('train') || lower.includes('public')) && !mappedModes.includes('transit')) mappedModes.push('transit');
          if (lower.includes('driv') && !mappedModes.includes('driving')) mappedModes.push('driving');
          if (lower.includes('mixed')) {
            if (!mappedModes.includes('walking')) mappedModes.push('walking');
            if (!mappedModes.includes('cycling')) mappedModes.push('cycling');
            if (!mappedModes.includes('transit')) mappedModes.push('transit');
          }
        });
        if (mappedModes.length > 0) {
          setModes(mappedModes);
        }
      }
    }catch(err){
      console.warn("Preferences/carbon sync warning:", err);
    }
  };
  const fetchHistory = async()=>{
    try{const r=await axios.get('/api/history');setHistory(r.data||[]);}catch{}
  };

  const startResizing = useCallback((e) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e) => {
    if (!isResizing.current) return;
    let newWidth = e.clientX;
    if (newWidth < 340) newWidth = 340;
    if (newWidth > 700) newWidth = 700;
    setSidebarWidth(newWidth);
    if (map.current) map.current.resize();
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  /* ── Auto night mode ── */
  useEffect(() => {
    const h = new Date().getHours();
    const isNight = h>=20||h<6;
    setNightMode(isNight);
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      if (e.key==='?') { setShowShortcuts(v=>!v); return; }
      if (e.key==='Escape') { setShowShortcuts(false); setShowModal(false); clearAll(); return; }
      if (e.key==='v'||e.key==='V') { setVoiceOn(v=>!v); return; }
      if (e.key==='t'||e.key==='T') { toggleTraffic(); return; }
      if (e.key==='s'||e.key==='S') { toggleStyle(); return; }
      if (e.key==='n'||e.key==='N') { if (selectedRoute) startNav(selectedRoute); return; }
      if ((e.ctrlKey||e.metaKey)&&e.key==='Enter') { e.preventDefault(); if (origin&&destination) setShowModal(true); return; }
      if (e.key==='Tab'&&routes.length>1) {
        e.preventDefault();
        const ci=routes.findIndex(r=>r.mode===selectedRoute?.mode);
        selectRoute(routes[(ci+1)%routes.length]);
        return;
      }
    };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  }, [origin,destination,routes,selectedRoute,voiceOn]);

  /* ── Map init ── */
  useEffect(() => {
    if (map.current) return;
    const initStyle = nightMode
      ? 'mapbox://styles/mapbox/navigation-night-v1'
      : 'mapbox://styles/mapbox/streets-v12';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: initStyle,
      center: [77.2090, 28.6139],
      zoom: 12, pitch:0, bearing:0, antialias:true,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.AttributionControl({compact:true}),'bottom-right');
    map.current.addControl(new mapboxgl.NavigationControl({visualizePitch:true}),'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:false}),'top-right');
    map.current.addControl(new mapboxgl.ScaleControl({maxWidth:100,unit:'metric'}),'bottom-left');

    const geocodeAddress = async (query) => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
        const res = await axios.get(url);
        const feature = res.data.features?.[0];
        if (feature) {
          return {
            name: feature.place_name,
            coordinates: feature.center
          };
        }
      } catch (err) {
        console.error("Geocoding failed for:", query, err);
      }
      return null;
    };

    const handleQueryParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const toParam = params.get('to');
      const fromParam = params.get('from');
      const modeParam = params.get('mode');

      if (!toParam && !fromParam) return;

      let resolvedOrigin = null;
      let resolvedDest = null;

      if (fromParam) {
        resolvedOrigin = await geocodeAddress(fromParam);
        if (resolvedOrigin) {
          setOrigin(resolvedOrigin);
          placePin('origin', resolvedOrigin.coordinates);
          const el = document.querySelector('#geocoder-origin input');
          if (el) el.value = resolvedOrigin.name;
        }
      }

      if (toParam) {
        resolvedDest = await geocodeAddress(toParam);
        if (resolvedDest) {
          setDestination(resolvedDest);
          placePin('dest', resolvedDest.coordinates);
          const el = document.querySelector('#geocoder-dest input');
          if (el) el.value = resolvedDest.name;
        }
      }

      // Check quick destination from Saved Places
      const quickDestStr = sessionStorage.getItem('gr_quick_destination');
      if (quickDestStr) {
        try {
          const qd = JSON.parse(quickDestStr);
          sessionStorage.removeItem('gr_quick_destination');
          if (qd && qd.coordinates) {
            setDestination(qd);
            placePin('dest', qd.coordinates);
            setTimeout(() => {
              const el = document.querySelector('#geocoder-dest input');
              if (el) el.value = qd.name || '';
            }, 300);
            if (map.current) {
              map.current.easeTo({ center: qd.coordinates, zoom: 14, duration: 900 });
            }
          }
        } catch {}
      }

      if (map.current) {
        if (resolvedOrigin && resolvedDest) {
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend(resolvedOrigin.coordinates);
          bounds.extend(resolvedDest.coordinates);
          map.current.fitBounds(bounds, { padding: 80, duration: 1200 });
        } else if (resolvedDest) {
          map.current.easeTo({ center: resolvedDest.coordinates, zoom: 13, duration: 900 });
        } else if (resolvedOrigin) {
          map.current.easeTo({ center: resolvedOrigin.coordinates, zoom: 13, duration: 900 });
        }
      }

      if (resolvedOrigin && resolvedDest) {
        setLoading(true); setRoutes([]); setSelectedRoute(null);
        cancelAnim();
        if(travMarker.current){travMarker.current.remove();travMarker.current=null;}

        try {
          const reqModes = modeParam ? [modeParam.toLowerCase()] : modes;
          const res = await axios.post('/api/route', {
            origin: { coordinates: resolvedOrigin.coordinates, name: resolvedOrigin.name },
            destination: { coordinates: resolvedDest.coordinates, name: resolvedDest.name },
            transportModes: reqModes,
            departureTime: departureTime || undefined,
          });

          const recentEntry={
            originName:resolvedOrigin.name, destName:resolvedDest.name,
            originCoords:resolvedOrigin.coordinates, destCoords:resolvedDest.coordinates,
            mode:reqModes[0], date:new Date().toLocaleDateString(),
          };
          const prev=JSON.parse(localStorage.getItem(RECENT_ROUTES_KEY)||'[]');
          localStorage.setItem(RECENT_ROUTES_KEY,JSON.stringify([recentEntry,...prev.slice(0,4)]));

          const data=res.data||[];
          if(data.length){
            setRoutes(data); setPanel('routes');
            const first=data[0];
            setSelectedRoute(first);
            displayAllRoutes(data,first);
            fetchWeather(resolvedDest.coordinates[1],resolvedDest.coordinates[0]);
            fetchAqi(resolvedDest.coordinates[1],resolvedDest.coordinates[0]);
          }
        } catch (err) {
          console.error("Failed to fetch route for query params:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    const requestInitialLocation = () => {
      const fallbackToIPLocation = async () => {
        try {
          const response = await fetch('https://ipinfo.io/json');
          const data = await response.json();
          if (data && data.loc) {
            const [latitude, longitude] = data.loc.split(',').map(Number);
            if (map.current) {
              map.current.flyTo({ center: [longitude, latitude], zoom: 13, speed: 1.2 });
            }
          }
        } catch (err) {
          console.warn('Geolocation fallback issue:', err);
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (map.current) {
              map.current.flyTo({ center: [longitude, latitude], zoom: 13, speed: 1.2 });
            }
          },
          (error) => {
            console.warn('GPS Error or Denied, falling back to IP:', error);
            fallbackToIPLocation();
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        fallbackToIPLocation();
      }
    };

    map.current.on('load', () => {
      initGeocoders();
      map.current.resize();
      
      const params = new URLSearchParams(window.location.search);
      if (!params.get('to') && !params.get('from')) {
        requestInitialLocation();
      }
      
      handleQueryParams();
    });

    fetchWeather(28.6139, 77.2090);
    fetchCarbon();
    fetchHistory();
    return () => cancelAnim();
  }, []);

  /* ── Geocoders (Global & Dynamic Proximity) ── */
  const initGeocoders = useCallback(() => {
    ['geocoder-origin','geocoder-dest'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.innerHTML='';
    });

    const center = map.current ? map.current.getCenter() : { lng: 77.2090, lat: 28.6139 };

    const opts = {
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      marker: false,
      flyTo: false,
      proximity: { longitude: center.lng, latitude: center.lat },
      language: 'en',
      types: 'country,region,postcode,district,place,locality,neighborhood,address,poi',
      minLength: 0
    };

    const localGeocoderCurrentLocation = (query) => {
      const match = 'use current location'.includes(query.toLowerCase()) || 'current location'.includes(query.toLowerCase());
      if (query === '' || match) {
        return [
          {
            id: 'current-location',
            type: 'Feature',
            place_name: '📍 Use current location',
            center: [0, 0],
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            },
            properties: {
              isCurrentLocation: true
            },
            place_type: ['place']
          }
        ];
      }
      return [];
    };

    const oGeo=new MapboxGeocoder({
      ...opts,
      placeholder:'Search start location or place...',
      localGeocoder: localGeocoderCurrentLocation
    });
    const dGeo=new MapboxGeocoder({
      ...opts,
      placeholder:'Search destination or landmark...'
    });
    originGeoRef.current=oGeo; destGeoRef.current=dGeo;
    const oEl=document.getElementById('geocoder-origin');
    const dEl=document.getElementById('geocoder-dest');
    if(oEl) oEl.appendChild(oGeo.onAdd(map.current));
    if(dEl) dEl.appendChild(dGeo.onAdd(map.current));

    oGeo.on('result',e=>{
      if (e.result.id === 'current-location') {
        setTimeout(() => {
          const input = document.querySelector('#geocoder-origin input');
          if (input) {
            input.value = 'Current Location';
            input.blur();
          }
        }, 50);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const coords = [longitude, latitude];
            
            setOrigin({ coordinates: coords, name: 'Current Location' });
            placePin('origin', coords);
            
            map.current.easeTo({ center: coords, zoom: 15.5, duration: 1200 });
            setMapSelectDestMode(true);
            
            setSaveMsg('Current location set! Click map or search destination.');
            setTimeout(() => setSaveMsg(''), 3500);
          },
          (err) => {
            console.error(err);
            setSaveMsg('Failed to get location');
            setTimeout(() => setSaveMsg(''), 2500);
            
            setTimeout(() => {
              const input = document.querySelector('#geocoder-origin input');
              if (input) input.value = '';
            }, 50);
            setOrigin(null);
            if (originMarker.current) {
              originMarker.current.remove();
              originMarker.current = null;
            }
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        const c=e.result.center;
        setOrigin({coordinates:c,name:e.result.place_name});
        placePin('origin',c);
        map.current.easeTo({center:c,zoom:14,duration:900});
      }
    });
    oGeo.on('clear',()=>{ 
      setOrigin(null); 
      setMapSelectDestMode(false);
      if(originMarker.current){originMarker.current.remove();originMarker.current=null;} 
    });

    dGeo.on('result',e=>{
      const c=e.result.center;
      setDestination({coordinates:c,name:e.result.place_name});
      placePin('dest',c);
      map.current.easeTo({center:c,zoom:14,duration:900});
    });
    dGeo.on('clear',()=>{ setDestination(null); if(destMarker.current){destMarker.current.remove();destMarker.current=null;} });
  },[]);

  /* ── Pins ── */
  const placePin = useCallback((type,coords) => {
    const isO=type==='origin', ref=isO?originMarker:destMarker;
    const color=isO?'#34a853':'#ea4335', label=isO?'A':'B';
    if(ref.current) ref.current.remove();
    const el=document.createElement('div');
    el.className='gm-pin-wrap'; el.innerHTML=makePinSVG(label,color);
    ref.current=new mapboxgl.Marker({element:el,anchor:'bottom',offset:[0,0]})
      .setLngLat(coords).addTo(map.current);
  },[]);

  const reverseGeocode = async (lng, lat) => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=poi,address,neighborhood,locality,place,district&limit=1`;
      const res = await axios.get(url);
      const feature = res.data.features?.[0];
      if (feature && feature.place_name) {
        return feature.place_name;
      }
    } catch (err) {
      console.warn("Mapbox reverse geocode fallback:", err);
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lon=${lng}&lat=${lat}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    } catch (err) {
      console.warn("Nominatim reverse geocode fallback:", err);
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  useEffect(() => {
    if (!map.current) return;
    
    const handleMapClick = async (e) => {
      if (!mapSelectDestMode) return;
      
      const { lng, lat } = e.lngLat;
      
      setSaveMsg('Resolving destination...');
      setTimeout(() => setSaveMsg(''), 1000);
      
      const addressName = await reverseGeocode(lng, lat);
      
      setDestination({
        coordinates: [lng, lat],
        name: addressName
      });
      placePin('dest', [lng, lat]);
      
      setTimeout(() => {
        const dInput = document.querySelector('#geocoder-dest input');
        if (dInput) {
          dInput.value = addressName;
        }
      }, 50);
      
      setSaveMsg('Destination set!');
      setTimeout(() => setSaveMsg(''), 2500);
    };
    
    map.current.on('click', handleMapClick);
    return () => {
      if (map.current) map.current.off('click', handleMapClick);
    };
  }, [mapSelectDestMode, placePin]);

  /* ── Traveller (Google Maps Navigation Puck) ── */
  const cancelAnim = () => {
    if(animFrame.current) cancelAnimationFrame(animFrame.current);
    if(dashAnimFrame.current) cancelAnimationFrame(dashAnimFrame.current);
    animFrame.current=null; dashAnimFrame.current=null;
  };

  const spawnTraveller = useCallback((coords,modeIcon,color) => {
    if(travMarker.current) travMarker.current.remove();
    const el=document.createElement('div');
    el.className='gm-traveller-puck';
    el.innerHTML=`
      <div class="gm-puck-halo"></div>
      <div class="gm-puck-cone"></div>
      <div class="gm-puck-core">
        <div class="gm-puck-inner"></div>
      </div>
    `;
    travMarker.current=new mapboxgl.Marker({
      element:el,
      anchor:'center',
      rotationAlignment:'map',
      pitchAlignment:'map'
    })
      .setLngLat(coords).addTo(map.current);
  },[]);

  const handleTripCompletion = useCallback(async (route, isVerifiedPhysicalTravel = true) => {
    if(!route||!origin||!destination) return;
    setIsNavigating(false);
    setActiveStep(null);
    setPanel('routes');
    cancelAnim();
    if(window.speechSynthesis) window.speechSynthesis.cancel();

    if(watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setDistToDest(null);

    if (map.current) {
      map.current.easeTo({pitch:0,bearing:0,zoom:12,duration:1200,easing:easeInOutCubic});
      if(travMarker.current) {
        travMarker.current.remove();
        travMarker.current = null;
      }
    }

    if (!isVerifiedPhysicalTravel) {
      setSaveMsg("Simulation preview ended. Real GPS travel is required to earn carbon points.");
      setTimeout(() => setSaveMsg(''), 4500);
      return;
    }

    const newTrip = {
      _id: 'trip_' + Date.now(),
      originName: origin.name,
      destinationName: destination.name,
      originCoords: { lat: origin.coordinates[1], lng: origin.coordinates[0] },
      destinationCoords: { lat: destination.coordinates[1], lng: destination.coordinates[0] },
      mode: route.mode,
      distance: parseFloat(route.distance),
      duration: parseInt(route.duration),
      co2Saved: parseFloat(route.co2Saved),
      calories: route.calories || 0,
      date: new Date().toISOString()
    };

    try {
      const prev = JSON.parse(localStorage.getItem('gr_trip_history') || '[]');
      localStorage.setItem('gr_trip_history', JSON.stringify([newTrip, ...prev]));
    } catch {}

    try {
      await axios.post('/api/history', {
        originName: origin.name, destinationName: destination.name,
        originCoords: { lat: origin.coordinates[1], lng: origin.coordinates[0] },
        destinationCoords: { lat: destination.coordinates[1], lng: destination.coordinates[0] },
        mode: route.mode, distance: parseFloat(route.distance),
        duration: parseInt(route.duration),
        co2Saved: parseFloat(route.co2Saved), calories: route.calories || 0,
      });
    } catch (err) {
      console.warn('Backend history save error, trip saved to localStorage:', err);
    }

    setCompletedTrip({
      mode: route.mode,
      distance: parseFloat(route.distance),
      duration: parseInt(route.duration),
      co2Saved: parseFloat(route.co2Saved),
      calories: route.calories || 0,
      originName: origin.name,
      destinationName: destination.name
    });
    setShowArrivalModal(true);
    fetchCarbon();
    fetchHistory();
  }, [origin,destination,fetchCarbon,fetchHistory]);

  const startRouteAnimation = useCallback((coords,modeIcon,color,loop=true,navMode=false) => {
    cancelAnim();
    if(!coords?.length) return;
    spawnTraveller(coords[0],modeIcon,color);
    animStart.current=null; animPausedAt.current=null;

    const BASE_DUR=Math.max(coords.length*90,10000);

    const tick=(ts)=>{
      if(!animStart.current) animStart.current=ts;
      const elapsed=(ts-animStart.current)*animSpeed;
      const raw=Math.min(elapsed/BASE_DUR,1);
      const t=easeInOutCubic(raw);
      const pos=interpolateRoute(coords,t);
      const next=interpolateRoute(coords,Math.min(t+0.002,1));

      if(travMarker.current){
        travMarker.current.setLngLat(pos);
        const bearing=getBearing(pos,next);
        const dot=travMarker.current.getElement()?.querySelector('.gm-dot');
        if(dot) dot.style.transform=`rotate(${bearing}deg)`;
      }

      setAnimProgress(raw);

      /* Voice instructions */
      if(navMode&&voiceOn&&selectedRoute?.steps){
        const stepPct=raw*selectedRoute.steps.length;
        const stepIdx=Math.floor(stepPct);
        if(stepIdx!==lastSpokenStep.current&&stepIdx<selectedRoute.steps.length){
          lastSpokenStep.current=stepIdx;
          speak(selectedRoute.steps[stepIdx].instruction);
          setActiveStep(stepIdx);
        }
      }

      /* Camera follow in nav mode */
      if(navMode&&map.current){
        map.current.easeTo({
          center:pos, bearing:getBearing(pos,next),
          pitch:55, zoom:17, duration:180, easing:x=>x,
        });
      }

      if(raw<1){
        animFrame.current=requestAnimationFrame(tick);
      } else {
        if(loop){
          animStart.current=null;
          animFrame.current=requestAnimationFrame(tick);
        }
      }
    };

    if(isPlaying) animFrame.current=requestAnimationFrame(tick);
  },[spawnTraveller,animSpeed,isPlaying,voiceOn,selectedRoute,handleTripCompletion]);

  /* ── Voice ── */
  const speak = (text) => {
    if(!voiceOn||!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt=new SpeechSynthesisUtterance(text);
    utt.rate=1.05; utt.pitch=1; utt.volume=1;
    const voices=window.speechSynthesis.getVoices();
    const eng=voices.find(v=>v.lang.startsWith('en'));
    if(eng) utt.voice=eng;
    speechRef.current=utt;
    window.speechSynthesis.speak(utt);
  };

  /* ── Playback controls ── */
  const handlePlayPause = () => {
    if(isPlaying){
      cancelAnim();
      animPausedAt.current=animProgress;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if(selectedRoute?.geometry?.coordinates){
        const meta=MODE_META[selectedRoute.mode]||{};
        animStart.current=null;
        startRouteAnimation(selectedRoute.geometry.coordinates,meta.mapIcon,meta.color,true,isNavigating);
      }
    }
  };

  const handleSeek = (t) => {
    setAnimProgress(t);
    animPausedAt.current=t;
    if(selectedRoute?.geometry?.coordinates){
      const pos=interpolateRoute(selectedRoute.geometry.coordinates,t);
      if(travMarker.current) travMarker.current.setLngLat(pos);
    }
  };

  /* ── Route layers ── */
  const clearRouteLayer = () => {
    if(!map.current) return;
    
    // Remove all layers starting with rp-
    try {
      const style = map.current.getStyle();
      if (style && style.layers) {
        style.layers.forEach(layer => {
          if (layer.id.startsWith('rp-')) {
            map.current.removeLayer(layer.id);
          }
        });
      }
    } catch (e) {
      console.warn("Error clearing layers:", e);
    }

    // Remove all sources starting with rp-
    try {
      const style = map.current.getStyle();
      if (style && style.sources) {
        Object.keys(style.sources).forEach(sourceId => {
          if (sourceId.startsWith('rp-')) {
            map.current.removeSource(sourceId);
          }
        });
      }
    } catch (e) {
      console.warn("Error clearing sources:", e);
    }
  };

  /* Draw ALL routes simultaneously — like Google Maps */
  const displayAllRoutes = useCallback((allRoutes,activeRoute) => {
    if(!map.current) return;
    clearRouteLayer();

    /* Draw inactive routes first (muted) */
    allRoutes.forEach((route,i)=>{
      if(route.mode===activeRoute.mode) return;
      const color=MODE_META[route.mode]?.color||'#94a3b8';
      const srcId=`rp-alt-src-${i}`;
      map.current.addSource(srcId,{type:'geojson',data:{type:'Feature',properties:{},geometry:route.geometry}});
      map.current.addLayer({id:`rp-alt-casing-${i}`,type:'line',source:srcId,
        layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],10,6,14,10,18,16],'line-opacity':0.5}
      });
      map.current.addLayer({id:`rp-alt-${i}`,type:'line',source:srcId,
        layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':color,'line-width':['interpolate',['linear'],['zoom'],10,3,14,6,18,10],'line-opacity':0.4}
      });
      /* Click to select */
      map.current.on('click',`rp-alt-${i}`,()=>selectRoute(route));
      map.current.on('mouseenter',`rp-alt-${i}`,()=>map.current.getCanvas().style.cursor='pointer');
      map.current.on('mouseleave',`rp-alt-${i}`,()=>map.current.getCanvas().style.cursor='');
    });

    /* Draw active route on top */
    const color=MODE_META[activeRoute.mode]?.color||'#10b981';
    map.current.addSource('rp-route',{type:'geojson',data:{type:'Feature',properties:{},geometry:activeRoute.geometry}});
    map.current.addLayer({id:'rp-halo',type:'line',source:'rp-route',layout:{'line-join':'round','line-cap':'round'},
      paint:{'line-color':color,'line-width':['interpolate',['linear'],['zoom'],10,20,14,32,18,48],'line-opacity':0.08,'line-blur':10}
    });
    map.current.addLayer({id:'rp-casing',type:'line',source:'rp-route',layout:{'line-join':'round','line-cap':'round'},
      paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],10,8,14,14,18,20],'line-opacity':1}
    });
    map.current.addLayer({id:'rp-fill',type:'line',source:'rp-route',layout:{'line-join':'round','line-cap':'round'},
      paint:{'line-color':color,'line-width':['interpolate',['linear'],['zoom'],10,5,14,9,18,14],'line-opacity':0.95}
    });
    map.current.addLayer({id:'rp-dash',type:'line',source:'rp-route',layout:{'line-join':'round','line-cap':'round'},
      paint:{'line-color':'rgba(255,255,255,0.9)','line-width':['interpolate',['linear'],['zoom'],10,1.5,14,2.5,18,4],'line-dasharray':[0,4,3]}
    });

    let dashStep=0;
    const animDash=()=>{
      if(!map.current?.getLayer('rp-dash')) return;
      dashStep=(dashStep+0.28)%7;
      map.current.setPaintProperty('rp-dash','line-dasharray',[dashStep*0.3,4,3]);
      dashAnimFrame.current=requestAnimationFrame(animDash);
    };
    requestAnimationFrame(animDash);

    /* Fit bounds */
    const allCoords=allRoutes.flatMap(r=>r.geometry?.coordinates||[]);
    if(allCoords.length){
      const bounds=new mapboxgl.LngLatBounds();
      allCoords.forEach(c=>bounds.extend(c));
      const desktopLeftPad = (window.innerWidth > 768) ? (sidebarWidth + 50) : 40;
      map.current.fitBounds(bounds,{padding:{top:80,bottom:isNavigating?260:80,left:desktopLeftPad,right:80},duration:1400,easing:easeInOutCubic,pitch:0,bearing:0});
    }

    /* Traveller */
    const meta=MODE_META[activeRoute.mode]||{};
    startRouteAnimation(activeRoute.geometry.coordinates,meta.mapIcon,meta.color,true,false);
  },[startRouteAnimation,isNavigating]);

  const selectRoute = useCallback((route) => {
    setSelectedRoute(route);
    setPanel('routes');
    setActiveStep(null);
    setIsNavigating(false);
    lastSpokenStep.current=-1;
    if(routes.length>0) displayAllRoutes(routes,route);
    else displayAllRoutes([route],route);
  },[routes,displayAllRoutes]);

  /* ── Traffic toggle ── */
  const toggleTraffic = useCallback(() => {
    if(!map.current) return;
    setTraffic(v=>{
      const next=!v;
      if(next){
        if(!map.current.getSource('mapbox-traffic')){
          map.current.addSource('mapbox-traffic',{type:'vector',url:'mapbox://mapbox.mapbox-traffic-v1'});
        }
        if(!map.current.getLayer('traffic-layer')){
          map.current.addLayer({
            id:'traffic-layer', type:'line',
            source:'mapbox-traffic', 'source-layer':'traffic',
            paint:{
              'line-width':2.5,
              'line-color':[
                'match',['get','congestion'],
                'low','#22c55e','moderate','#f59e0b','heavy','#ef4444','severe','#7f1d1d',
                '#94a3b8'
              ],
              'line-opacity':0.82,
            },
          },'rp-casing');
        }
      } else {
        if(map.current.getLayer('traffic-layer')) map.current.removeLayer('traffic-layer');
      }
      return next;
    });
  },[]);

  /* ── Map style toggle (FIXED - no fog on satellite) ── */
  const toggleStyle = useCallback(() => {
    if(!map.current||isStyleLoading.current) return;
    isStyleLoading.current=true;

    const styles = nightMode
      ? { current:'navigation-night-v1', next:'satellite-streets-v12' }
      : { current:'streets-v12',         next:'satellite-streets-v12' };
    const next = mapStyle==='streets-v12'||mapStyle==='navigation-night-v1'
      ? 'satellite-streets-v12' : (nightMode?'navigation-night-v1':'streets-v12');

    try { map.current.setFog(null); } catch {}
    cancelAnim();
    setMapStyle(next);
    map.current.setStyle(`mapbox://styles/mapbox/${next}`);

    map.current.once('style.load',()=>{
      isStyleLoading.current=false;
      if(next==='streets-v12'){
        try { map.current.setFog({color:'rgb(248,250,252)','high-color':'rgb(219,234,254)','horizon-blend':0.04}); } catch {}
      }
      if(routes.length>0&&selectedRoute) displayAllRoutes(routes,selectedRoute);
      else if(selectedRoute) displayAllRoutes([selectedRoute],selectedRoute);
      if(originMarker.current&&origin) placePin('origin',origin.coordinates);
      if(destMarker.current&&destination) placePin('dest',destination.coordinates);
      if(traffic) toggleTraffic();
    });
  },[mapStyle,nightMode,routes,selectedRoute,origin,destination,displayAllRoutes,placePin,traffic,toggleTraffic]);

  /* ── Night mode toggle ── */
  const toggleNightMode = () => {
    if(!map.current||isStyleLoading.current) return;
    isStyleLoading.current=true;
    const next=!nightMode;
    setNightMode(next);
    try { map.current.setFog(null); } catch {}
    cancelAnim();
    const style=next?'navigation-night-v1':'streets-v12';
    setMapStyle(style);
    map.current.setStyle(`mapbox://styles/mapbox/${style}`);
    map.current.once('style.load',()=>{
      isStyleLoading.current=false;
      if(!next){
        try { map.current.setFog({color:'rgb(248,250,252)','high-color':'rgb(219,234,254)','horizon-blend':0.04}); } catch {}
      }
      if(routes.length>0&&selectedRoute) displayAllRoutes(routes,selectedRoute);
      if(originMarker.current&&origin) placePin('origin',origin.coordinates);
      if(destMarker.current&&destination) placePin('dest',destination.coordinates);
    });
  };

  /* ── Elevation data ── */
  const fetchElevation = useCallback(async (coords) => {
    if(!coords?.length) return;
    const sample=coords.filter((_,i)=>i%Math.max(1,Math.floor(coords.length/40))===0).slice(0,40);
    try {
      const results=await Promise.all(sample.map(async ([lng,lat])=>{
        const r=await fetch(`https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json?layers=contour&limit=1&access_token=${mapboxgl.accessToken}`);
        const d=await r.json();
        return d.features?.[0]?.properties?.ele||0;
      }));
      setElevData(results);
    } catch { setElevData([]); }
  },[]);

  /* ── Plan route ── */
  const planRoute = async () => {
    if(!origin||!destination) return;
    if(!modes.length) { alert('Select at least one transport mode.'); return; }
    setShowModal(false); setLoading(true); setRoutes([]); setSelectedRoute(null);
    setMapSelectDestMode(false);
    cancelAnim();
    if(travMarker.current){travMarker.current.remove();travMarker.current=null;}

    try {
      const res=await axios.post('/api/route',{
        origin:{coordinates:origin.coordinates,name:origin.name},
        destination:{coordinates:destination.coordinates,name:destination.name},
        transportModes:modes,
        departureTime:departureTime||undefined,
      });

      /* Save to recent */
      const recentEntry={
        originName:origin.name, destName:destination.name,
        originCoords:origin.coordinates, destCoords:destination.coordinates,
        mode:modes[0], date:new Date().toLocaleDateString(),
      };
      const prev=JSON.parse(localStorage.getItem(RECENT_ROUTES_KEY)||'[]');
      localStorage.setItem(RECENT_ROUTES_KEY,JSON.stringify([recentEntry,...prev.slice(0,4)]));

      const data=res.data||[];
      if(data.length){
        setRoutes(data); setPanel('routes'); setSearchCollapsed(true);
        const first=data[0];
        setSelectedRoute(first);
        displayAllRoutes(data,first);
        fetchWeather(destination.coordinates[1],destination.coordinates[0]);
        fetchAqi(destination.coordinates[1],destination.coordinates[0]);
        fetchElevation(first.geometry?.coordinates||[]);
      } else { alert('No routes found. Try different locations.'); }
    } catch(err){
      alert(err.response?.data?.error||'Failed to plan route.');
    } finally {
      setLoading(false);
    }
  };

  const recalculateRoute = async (lng, lat) => {
    const now = Date.now();
    if (now - lastRecalculateTime.current < 15000) {
      return; // 15s cooldown
    }
    lastRecalculateTime.current = now;
    
    if (voiceOnRef.current) {
      speak("You are off route. Recalculating route.");
    }
    
    const newOrigin = {
      coordinates: [lng, lat],
      name: "Current Location"
    };
    setOrigin(newOrigin);
    placePin('origin', [lng, lat]);
    
    const oI = document.querySelector('#geocoder-origin input');
    if (oI) oI.value = "Current Location";

    try {
      const res = await axios.post('/api/route', {
        origin: { coordinates: [lng, lat], name: "Current Location" },
        destination: { coordinates: destinationRef.current.coordinates, name: destinationRef.current.name },
        transportModes: [selectedRouteRef.current.mode],
        departureTime: departureTimeRef.current || undefined,
      });
      
      const data = res.data || [];
      if (data.length) {
        const newRoute = data[0];
        setRoutes(data);
        setSelectedRoute(newRoute);
        setActiveStep(0);
        lastSpokenStep.current = -1;
        displayAllRoutes(data, newRoute);
        if (voiceOnRef.current) {
          speak(`New route found. ${newRoute.duration} minutes to destination.`);
        }
      }
    } catch (err) {
      console.error("Failed to recalculate route:", err);
    }
  };

  const recalculateRouteRef = useRef(null);
  recalculateRouteRef.current = recalculateRoute;

  /* ── Navigation ── */
  const startNav = useCallback((route, forceGPS = null) => {
    setIsNavigating(true); setPanel('directions'); setActiveStep(0);
    lastSpokenStep.current=-1; navStartTime.current=Date.now();
    cancelAnim();
    
    const meta=MODE_META[route.mode]||{};
    const coords=route?.geometry?.coordinates||[];
    
    if (forceGPS === true) {
      setUseGPS(true);
    }
    const activeGPS = forceGPS !== null ? forceGPS : useGPS;
    
    if (activeGPS) {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        setUseGPS(false);
        if(coords.length) startRouteAnimation(coords,meta.mapIcon,meta.color,false,true);
        return;
      }
      
      physicalTraveledKmRef.current = 0;
      lastGPSCoordRef.current = null;
      isTripVerifiedRef.current = false;
      
      spawnTraveller(coords[0] || origin.coordinates, meta.mapIcon, meta.color);
      
      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const currentPos = [longitude, latitude];
          
          if (travMarker.current) {
            travMarker.current.setLngLat(currentPos);
          }
          
          if (map.current) {
            map.current.easeTo({ center: currentPos, zoom: 17, pitch: 55, duration: 800 });
          }
          
          if (lastGPSCoordRef.current) {
            const stepKm = getOrthoDistance(
              lastGPSCoordRef.current[1], lastGPSCoordRef.current[0],
              latitude, longitude
            ) / 1000;
            // Filter stationary jitter (< 2m) and impossible teleportation (> 1km per ping)
            if (stepKm >= 0.002 && stepKm <= 1.0) {
              physicalTraveledKmRef.current += stepKm;
            }
          }
          lastGPSCoordRef.current = [longitude, latitude];
          
          const dist = getOrthoDistance(
            latitude, longitude,
            destinationRef.current.coordinates[1], destinationRef.current.coordinates[0]
          );
          setDistToDest(dist);
          
          if (dist <= 50) {
            const totalDistanceKm = parseFloat(selectedRouteRef.current?.distance) || 1;
            const minRequiredKm = Math.min(totalDistanceKm * 0.6, 0.15);
            
            if (physicalTraveledKmRef.current >= minRequiredKm || totalDistanceKm < 0.2) {
              isTripVerifiedRef.current = true;
              if (voiceOnRef.current) speak("Destination reached. Trip completed.");
              handleTripCompletion(selectedRouteRef.current, true);
            } else {
              if (voiceOnRef.current) speak("Destination reached, but insufficient travel was detected.");
              setSaveMsg("Physical travel is required to earn carbon score and ranking.");
              setTimeout(() => setSaveMsg(''), 4500);
              stopNav();
            }
            return;
          }

          // Progress calculation
          const totalDistance = parseFloat(selectedRouteRef.current.distance) * 1000 || 1;
          const currentProgress = Math.max(0, Math.min(1, 1 - (dist / totalDistance)));
          setAnimProgress(currentProgress);

          // Step progression
          const steps = selectedRouteRef.current?.steps || [];
          const currentStepIdx = activeStepRef.current;
          if (currentStepIdx !== null && currentStepIdx < steps.length) {
            const nextStepIdx = currentStepIdx + 1;
            if (nextStepIdx < steps.length) {
              const nextStep = steps[nextStepIdx];
              if (nextStep.location) {
                const distToNextStep = getOrthoDistance(
                  latitude, longitude,
                  nextStep.location[1], nextStep.location[0]
                );
                if (distToNextStep < 25) {
                  setActiveStep(nextStepIdx);
                  if (voiceOnRef.current) {
                    speak(nextStep.instruction);
                  }
                }
              }
            }
          }

          // Off-route check
          const routeCoords = selectedRouteRef.current?.geometry?.coordinates || [];
          if (routeCoords.length > 0) {
            let minDistance = Infinity;
            for (const coord of routeCoords) {
              const d = getOrthoDistance(latitude, longitude, coord[1], coord[0]);
              if (d < minDistance) {
                minDistance = d;
              }
            }

            if (minDistance > 80) {
              if (recalculateRouteRef.current) {
                recalculateRouteRef.current(longitude, latitude);
              }
            }
          }
        },
        (err) => {
          console.error(err);
          alert('GPS tracking error: ' + err.message + '. Falling back to simulation mode.');
          setUseGPS(false);
          const meta = MODE_META[selectedRouteRef.current?.mode] || {};
          const coords = selectedRouteRef.current?.geometry?.coordinates || [];
          if(coords.length) startRouteAnimation(coords,meta.mapIcon,meta.color,false,true);
        },
        geoOptions
      );
      
      if(voiceOnRef.current) speak(`Starting live GPS navigation. ${route.duration} minutes to destination.`);
    } else {
      if(coords.length) startRouteAnimation(coords,meta.mapIcon,meta.color,false,true);
      if(voiceOnRef.current) speak(`Starting navigation preview. ${route.duration} minutes to destination.`);
    }
    
    map.current.easeTo({center:origin?.coordinates,bearing:0,pitch:55,zoom:17,duration:1600,easing:easeInOutCubic});
  },[startRouteAnimation,origin,useGPS,spawnTraveller,handleTripCompletion]);

  const stopNav = useCallback(()=>{
    setIsNavigating(false); setActiveStep(null); setPanel('routes');
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    lastSpokenStep.current=-1; navStartTime.current=null; cancelAnim();
    
    if(watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setDistToDest(null);

    if (!isTripVerifiedRef.current && physicalTraveledKmRef.current < 0.1) {
      setSaveMsg("Trip ended. Real physical travel to destination is required to earn points.");
      setTimeout(() => setSaveMsg(''), 4000);
    }

    map.current.easeTo({pitch:0,bearing:0,zoom:12,duration:1200,easing:easeInOutCubic});
    if(selectedRoute?.geometry?.coordinates){
      const meta=MODE_META[selectedRoute.mode]||{};
      startRouteAnimation(selectedRoute.geometry.coordinates,meta.mapIcon,meta.color,true,false);
    }
  },[selectedRoute,startRouteAnimation]);

  const focusStep = useCallback((step,idx)=>{
    setActiveStep(idx);
    if(selectedRoute?.geometry?.coordinates){
      const pos=interpolateRoute(selectedRoute.geometry.coordinates,idx/Math.max((selectedRoute.steps?.length||1)-1,1));
      map.current.easeTo({center:pos,zoom:17,pitch:45,duration:800});
    }
  },[selectedRoute]);

  /* ── Bookmark destination ── */
  const bookmarkDestination = () => {
    if(!destination) return;
    try {
      const places = JSON.parse(localStorage.getItem('gr_saved_places') || '[]');
      const name = destination.name || 'Unnamed place';
      
      const exists = places.some(p => p.name === name);
      if (exists) {
        setSaveMsg('Already saved!');
        setTimeout(() => setSaveMsg(''), 2500);
        return;
      }
      
      const newPlace = {
        id: Math.random().toString(36).substring(2, 11),
        name: name,
        lng: destination.coordinates[0],
        lat: destination.coordinates[1],
        savedAt: new Date().toISOString()
      };
      
      places.push(newPlace);
      localStorage.setItem('gr_saved_places', JSON.stringify(places));
      setSaveMsg('Saved to Places!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      console.error(err);
      setSaveMsg('Save failed');
      setTimeout(() => setSaveMsg(''), 2500);
    }
  };



  /* ── Swap ── */
  const swap = ()=>{
    const tmp=origin; setOrigin(destination); setDestination(tmp);
    const oI=document.querySelector('#geocoder-origin input');
    const dI=document.querySelector('#geocoder-dest input');
    if(oI) oI.value=destination?.name||'';
    if(dI) dI.value=origin?.name||'';
    if(destination) placePin('origin',destination.coordinates);
    if(origin)      placePin('dest',origin.coordinates);
    clearRouteLayer(); setRoutes([]); setSelectedRoute(null);
  };

  /* ── GPS Locate Me ── */
  const handleGpsClick = () => {
    setSaveMsg('Getting current location...');
    setTimeout(() => setSaveMsg(''), 2500);

    const input = document.querySelector('#geocoder-origin input');
    if (input) {
      input.value = 'Locating...';
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = [longitude, latitude];
        
        setOrigin({ coordinates: coords, name: 'Current Location' });
        placePin('origin', coords);
        
        if (input) {
          input.value = 'Current Location';
        }
        
        map.current.easeTo({ center: coords, zoom: 15, duration: 1200 });
        setMapSelectDestMode(true);
        
        setSaveMsg('Current location set! Click on map to set destination.');
        setTimeout(() => setSaveMsg(''), 3500);
      },
      (err) => {
        console.error(err);
        setSaveMsg('Failed to get location');
        setTimeout(() => setSaveMsg(''), 2500);
        
        if (input) {
          input.value = '';
        }
        setOrigin(null);
        if (originMarker.current) {
          originMarker.current.remove();
          originMarker.current = null;
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ── Clear all ── */
  const clearAll = ()=>{
    cancelAnim();
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    [travMarker,originMarker,destMarker].forEach(r=>{if(r.current){r.current.remove();r.current=null;}});
    setOrigin(null); setDestination(null); setRoutes([]); setSelectedRoute(null);
    setPanel('search'); setIsNavigating(false); setAnimProgress(0); setElevData([]);
    setSearchCollapsed(false);
    clearRouteLayer();
    if(originGeoRef.current) originGeoRef.current.clear();
    if(destGeoRef.current)   destGeoRef.current.clear();
    map.current.easeTo({center:[77.2090,28.6139],zoom:12,pitch:0,bearing:0,duration:1200});
  };

  /* ── Fetches ── */
/* ── fetchWeather — calls your backend, key stays server-side ── */
const fetchWeather = async (lat, lon) => {
  try {
    const r = await axios.get(`/api/weather?lat=${lat}&lon=${lon}`);
    setWeather(r.data);
  } catch (err) {
    console.warn('Weather unavailable:', err.message);
    setWeather(null);
  }
};

/* ── fetchAqi — calls your backend, key stays server-side ── */
const fetchAqi = async (lat, lon) => {
  try {
    const r = await axios.get(`/api/aqi?lat=${lat}&lon=${lon}`);
    if (r.data?.status === 'ok') {
      setAqi(r.data?.data?.aqi || null);
    }
  } catch (err) {
    console.warn('AQI unavailable:', err.message);
    setAqi(null);
  }
};
  const wxIcon=c=>({'01d':'Sunny','01n':'Clear','02d':'Partly Cloudy','02n':'Cloudy','03d':'Cloudy','04d':'Overcast','09d':'Rain','10d':'Showers','11d':'Thunderstorm','13d':'Snow','50d':'Fog'}[c]||'');
  const LOAD_MSGS=['Finding routes…','Calculating CO₂…','Comparing modes…','Optimising…'];

  const handleRecentSelect=(r)=>{
    const oI=document.querySelector('#geocoder-origin input');
    const dI=document.querySelector('#geocoder-dest input');
    if(oI) oI.value=r.originName||'';
    if(dI) dI.value=r.destName||'';
    setOrigin({coordinates:r.originCoords,name:r.originName});
    setDestination({coordinates:r.destCoords,name:r.destName});
    if(r.originCoords) placePin('origin',r.originCoords);
    if(r.destCoords)   placePin('dest',r.destCoords);
  };

  /* ─── RENDER ─────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes modalPop { from{opacity:0;transform:scale(0.94) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .rp-shell { display:flex;width:100%;height:100vh;overflow:hidden;background:var(--bg-primary);font-family:-apple-system,'SF Pro Display','Segoe UI',sans-serif;position:relative; }

        /* Sidebar & Resizer */
        .rp-sidebar { width:400px;min-width:360px;height:100vh;display:flex;flex-direction:column;background:var(--bg-secondary);box-shadow:2px 0 20px rgba(0,0,0,0.07);z-index:100;overflow:hidden;flex-shrink:0;border-right:1px solid var(--border-color); }
        .rp-resizer {
          width: 6px;
          cursor: col-resize;
          background: var(--border-color);
          z-index: 1000;
          align-self: stretch;
          transition: background 0.2s, transform 0.2s;
          transform-origin: center;
          flex-shrink: 0;
        }
        .rp-resizer:hover, .rp-resizer:active {
          background: var(--primary) !important;
          transform: scaleX(1.33);
        }

        /* Header */
        .rp-header { padding:14px 18px 12px;background:var(--bg-secondary);flex-shrink:0;border-bottom:1px solid var(--border-color); }
        .rp-hrow { display:flex;align-items:center;gap:6px;margin-bottom:12px; }
        .rp-logo { display:flex;align-items:center;gap:8px;flex:1; }
        .rp-logo-mark { width:28px;height:28px;background:linear-gradient(135deg,#059669,#34d399);border-radius:8px;flex-shrink:0;box-shadow:0 2px 8px rgba(5,150,105,0.35); }
        .rp-logo-name { font-size:1rem;font-weight:800;color:var(--text-primary);letter-spacing:-0.03em; }
        .rp-logo-name span{color:#10b981;}
        .rp-hbtn { width:32px;height:32px;border-radius:9px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0; }
        .rp-hbtn:hover{background:var(--hover-bg);border-color:var(--primary);color:var(--primary);}
        .rp-hbtn.on{background:var(--active-bg);border-color:var(--primary);color:var(--primary);}
        .rp-hbtn.night{background:#1e293b;color:#fbbf24;border-color:#1e293b;}

        /* Carbon */
        .rp-carbon{display:flex;align-items:center;background:linear-gradient(135deg,#064e3b,#065f46);border-radius:14px;padding:10px 14px;position:relative;overflow:hidden;}
        .rp-carbon::after{content:'';position:absolute;right:-8px;top:-8px;width:70px;height:70px;background:rgba(255,255,255,0.04);border-radius:50%;}
        .rp-cs{flex:1;text-align:center;}
        .rp-cv{display:block;font-size:1.15rem;font-weight:800;color:#fff;letter-spacing:-0.03em;line-height:1;}
        .rp-cl{display:block;font-size:0.6rem;color:rgba(167,243,208,0.7);text-transform:uppercase;letter-spacing:0.07em;margin-top:2px;}
        .rp-cdv{width:1px;height:26px;background:rgba(255,255,255,0.12);}
        .rp-cgoal{color:#6ee7b7!important;}
        .rp-cbar-wrap{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.15);}
        .rp-cbar{height:100%;width:100%;background:linear-gradient(90deg,#34d399,#6ee7b7);transform-origin:left;transition:transform 0.8s ease;}

        /* Search */
        .rp-search{margin:12px 14px 0;background:var(--bg-secondary);border-radius:16px;border:1.5px solid var(--border-color);box-shadow:0 2px 10px rgba(0,0,0,0.05);overflow:visible;flex-shrink:0;}
        .rp-srow{display:flex;align-items:center;padding:0 14px;min-height:50px;position:relative;gap:10px;}
        .rp-srow:focus-within{z-index:10;}
        .rp-srow:first-child{border-bottom:1px solid var(--border-color);}
        .rp-connector{position:absolute;left:22px;top:50px;height:16px;width:2px;background:repeating-linear-gradient(to bottom,#94a3b8 0,#94a3b8 3px,transparent 3px,transparent 6px);z-index:1;}
        .rp-sdot{width:12px;height:12px;border-radius:50%;flex-shrink:0;position:relative;z-index:1;}
        .rp-dot-a{background:#34a853;box-shadow:0 0 0 3px rgba(52,168,83,0.18);}
        .rp-dot-b{background:var(--bg-secondary);border:2.5px solid #ea4335;box-shadow:0 0 0 3px rgba(234,67,53,0.15);}
        .rp-geo-wrap{flex:1;min-width:0;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder{width:100%!important;max-width:100%!important;background:transparent!important;border:none!important;box-shadow:none!important;font-family:inherit!important;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder--input{height:46px!important;padding:0 38px 0 0!important;font-size:14px!important;color:var(--text-primary)!important;background:transparent!important;font-family:inherit!important;font-weight:500!important;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder--input::placeholder{color:#94a3b8!important;font-weight:400!important;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder--input:focus{outline:none!important;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder--icon-search{display:none!important;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder--button{top:50%!important;transform:translateY(-50%)!important;right:4px!important;height:32px!important;width:32px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:transparent!important;border:none!important;margin:0!important;padding:0!important;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder--icon-close{position:static!important;transform:none!important;fill:#94a3b8!important;width:16px!important;height:16px!important;margin:0!important;}
        .rp-geo-wrap .suggestions-wrapper{position:absolute!important;z-index:99999!important;left:-26px!important;right:-14px!important;top:calc(100% + 6px)!important;}
        .rp-geo-wrap .suggestions{position:relative!important;background:var(--bg-secondary)!important;border:1px solid var(--border-color)!important;border-radius:14px!important;box-shadow:0 12px 40px rgba(0,0,0,0.14)!important;overflow:hidden!important;max-height:260px!important;overflow-y:auto!important;list-style:none!important;padding:4px 0!important;}
        .rp-geo-wrap .suggestions li{padding:0!important;border:none!important;list-style:none!important;}
        .rp-geo-wrap .suggestions li a{display:flex!important;align-items:center!important;gap:10px!important;padding:11px 16px!important;text-decoration:none!important;color:var(--text-primary)!important;font-size:13px!important;transition:background 0.1s!important;}
        .rp-geo-wrap .suggestions li a:hover,.rp-geo-wrap .suggestions li.active a{background:var(--hover-bg)!important;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder--suggestion-title{font-weight:600!important;color:var(--text-primary)!important;}
        .rp-geo-wrap .mapboxgl-ctrl-geocoder--suggestion-address{font-size:11.5px!important;color:var(--text-secondary)!important;display:block!important;margin-top:1px!important;}

        .rp-sfoot{display:flex;align-items:center;gap:8px;padding:10px 12px;}
        .rp-swap{width:34px;height:34px;border-radius:50%;border:1.5px solid var(--border-color);background:var(--bg-primary);color:var(--text-secondary);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;}
        .rp-swap:hover:not(:disabled){border-color:var(--primary);color:var(--primary);background:var(--hover-bg);transform:rotate(180deg);}
        .rp-swap:disabled{opacity:.35;cursor:not-allowed;}
        .rp-gps-btn{width:34px;height:34px;border-radius:50%;border:1.5px solid var(--border-color);background:var(--bg-primary);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;margin-left:4px;}
        .rp-gps-btn:hover{border-color:#10b981;color:#10b981;background:var(--hover-bg);transform:scale(1.05);}
        .rp-find{flex:1;height:44px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all 0.2s;box-shadow:0 4px 14px rgba(16,185,129,0.32);font-family:inherit;}
        .rp-find:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,0.42);}
        .rp-find:active:not(:disabled){transform:translateY(0);}
        .rp-find:disabled{opacity:.5;cursor:not-allowed;}
        .rp-clear{height:44px;padding:0 12px;border-radius:12px;border:1.5px solid var(--red-light);background:var(--bg-secondary);color:var(--red);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all 0.15s;flex-shrink:0;}
        .rp-clear:hover{background:rgba(239,68,68,0.1);}
        .rp-spin{width:15px;height:15px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:rpSpin 0.65s linear infinite;flex-shrink:0;}
        @keyframes rpSpin{to{transform:rotate(360deg);}}

        /* Scroll */
        .rp-scroll{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--border-color) transparent;}
        .rp-scroll::-webkit-scrollbar{width:4px;}
        .rp-scroll::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:2px;}

        /* Chips */
        .rp-chips{display:flex;gap:6px;padding:10px 14px 0;overflow-x:auto;scrollbar-width:none;}
        .rp-chips::-webkit-scrollbar{display:none;}
        .rp-chip{display:flex;align-items:center;gap:5px;padding:6px 13px;border-radius:20px;border:1.5px solid var(--border-color);background:var(--bg-primary);color:var(--text-secondary);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.18s;white-space:nowrap;font-family:inherit;flex-shrink:0;}
        .rp-chip:hover{border-color:var(--text-muted);background:var(--hover-bg);}
        .rp-chip.on{background:var(--bg-secondary);border-color:var(--cc);color:var(--cc);box-shadow:0 2px 8px color-mix(in srgb,var(--cc) 18%,transparent);}

        /* Cards */
        .rp-cards{padding:10px 12px 14px;display:flex;flex-direction:column;gap:8px;}
        .rp-card{background:var(--bg-primary);border:1.5px solid transparent;border-radius:18px;padding:13px 13px 11px;cursor:pointer;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;}
        .rp-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--cc,#10b981);border-radius:18px 0 0 18px;transform:scaleY(0);transition:transform 0.2s;}
        .rp-card:hover{background:var(--bg-secondary);border-color:var(--border-color);box-shadow:0 4px 14px rgba(0,0,0,0.06);}
        .rp-card:hover::before{transform:scaleY(0.5);}
        .rp-card.sel{background:var(--bg-secondary);border-color:var(--cc,#10b981);box-shadow:0 6px 22px color-mix(in srgb,var(--cc) 14%,transparent);}
        .rp-card.sel::before{transform:scaleY(1);}
        .rp-card-head{display:flex;align-items:flex-start;gap:11px;margin-bottom:10px;}
        .rp-card-ico{width:44px;height:44px;border-radius:13px;background:color-mix(in srgb,var(--cc,#10b981) 12%,var(--bg-secondary));display:flex;align-items:center;justify-content:center;font-size:1.35rem;flex-shrink:0;transition:transform 0.2s;}
        .rp-card:hover .rp-card-ico,.rp-card.sel .rp-card-ico{transform:scale(1.05);}
        .rp-card-info{flex:1;min-width:0;}
        .rp-card-title{display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap;}
        .rp-card-name{font-size:15px;font-weight:700;color:var(--text-primary);}
        .rp-bdg{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;}
        .rp-bdg-rec{background:#fef9c3;color:#854d0e;border:1px solid #fde68a;}
        .rp-bdg-eco{background:#dcfce7;color:#166534;border:1px solid #bbf7d0;}
        .rp-card-eta{font-size:12px;color:var(--text-light);}
        .rp-stats{display:flex;flex-wrap:wrap;gap:8px;padding:10px 11px;background:var(--bg-primary);border-radius:11px;}
        .rp-stat{display:flex;align-items:center;gap:4px;font-size:12.5px;color:var(--text-secondary);}
        .rp-stat strong{font-size:14px;font-weight:800;color:var(--text-primary);}
        .rp-stat-eco strong{color:#10b981;}
        .rp-ctas{display:flex;gap:7px;margin-top:10px;animation:slideUp 0.2s ease;}
        .rp-go{flex:1;height:42px;background:linear-gradient(135deg,var(--cc,#10b981),color-mix(in srgb,var(--cc,#10b981) 70%,#000));border:none;border-radius:12px;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.18s;font-family:inherit;}
        .rp-go:hover{transform:translateY(-1px);box-shadow:0 4px 14px color-mix(in srgb,var(--cc) 35%,transparent);}
        .rp-dir-btn{flex:1;height:42px;border:1.5px solid var(--border-color);background:var(--bg-primary);border-radius:12px;color:var(--text-primary);font-size:13.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.18s;font-family:inherit;}
        .rp-dir-btn:hover{border-color:var(--primary);color:var(--primary);background:var(--hover-bg);transform:translateY(-1px);}
        .rp-save{width:42px;height:42px;border:1.5px solid var(--border-color);background:var(--bg-primary);border-radius:12px;color:var(--text-secondary);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.18s;flex-shrink:0;}
        .rp-save:hover{border-color:var(--primary);color:var(--primary);background:var(--hover-bg);}
        .rp-save.ok{border-color:var(--primary);color:var(--primary);background:var(--hover-bg);}

        /* Directions */
        .rp-dir{display:flex;flex-direction:column;flex:1;overflow:hidden;}
        .rp-dir-head{padding:14px 16px 12px;border-bottom:1px solid var(--border-color);background:var(--bg-secondary);flex-shrink:0;}
        .rp-dir-top-bar{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
        .rp-dir-back-inline{height:32px;padding:0 10px;border-radius:8px;border:1.5px solid var(--border-color);background:var(--bg-primary);color:var(--text-secondary);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.15s;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:5px;}
        .rp-dir-back-inline:hover{background:var(--hover-bg);border-color:var(--primary);color:var(--primary);}
        .rp-dir-sum{display:flex;align-items:center;gap:11px;flex:1;min-width:0;}
        .rp-dir-mode-ico{width:38px;height:38px;border-radius:11px;background:color-mix(in srgb,var(--cc,#10b981) 12%,var(--bg-secondary));display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0;}
        .rp-dir-title{font-size:13px;font-weight:700;color:var(--text-primary);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .rp-dir-meta{font-size:11.5px;color:var(--text-secondary);margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
        .rp-dir-meta-pill{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap;}
        .rp-dir-meta-pill.eco{background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.2);color:#059669;}
        .rp-dir-btns{display:flex;gap:8px;}
        .rp-nav-prog{display:flex;align-items:center;gap:10px;margin-top:8px;}
        .rp-npbar{flex:1;height:5px;background:var(--bg-primary);border-radius:999px;overflow:hidden;border:1px solid var(--border-color);}
        .rp-npfill{height:100%;width:100%;background:linear-gradient(90deg,#10b981,#34d399);border-radius:999px;transform-origin:left;transition:transform 0.4s ease;}
        .rp-nptxt{font-size:11px;color:var(--text-light);font-weight:700;white-space:nowrap;}
        .rp-steps{overflow-y:auto;flex:1;padding:8px 10px 24px;}
        .rp-step{display:flex;align-items:flex-start;gap:14px;padding:13px 12px;border-radius:14px;cursor:pointer;transition:all 0.15s;margin-bottom:2px;position:relative;}
        .rp-step:hover{background:var(--hover-bg);}
        .rp-step.on{background:rgba(16,185,129,0.12);box-shadow:inset 0 0 0 1px rgba(16,185,129,0.25);}
        .rp-step:not(:last-child)::after{content:'';position:absolute;left:28px;top:46px;bottom:-16px;width:1.5px;background:var(--border-color);z-index:0;}
        .rp-step.on::after{background:rgba(16,185,129,0.3);}
        .rp-step-ico{width:36px;height:36px;border-radius:50%;background:var(--bg-primary);border:2px solid var(--border-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;z-index:1;}
        .rp-step.on .rp-step-ico{background:#10b981;border-color:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,0.18);}
        .rp-step-body{flex:1;min-width:0;padding-top:1px;}
        .rp-step-inst{font-size:14px;font-weight:600;color:var(--text-primary);line-height:1.45;}
        .rp-step-dist{font-size:12px;color:var(--text-light);margin-top:4px;display:flex;align-items:center;gap:5px;}
        .rp-step-dist-badge{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:999px;padding:1px 7px;font-size:11px;font-weight:700;color:var(--text-secondary);}
        .rp-step-arrive{opacity:.65;cursor:default;}
        .rp-step-arrive:hover{background:transparent;}
        .rp-step-arrive.on{opacity:1;background:rgba(16,185,129,0.08);}
        .rp-btn-go{flex:1;height:40px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:11px;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s;font-family:inherit;box-shadow:0 3px 10px rgba(16,185,129,0.25);}
        .rp-btn-go:hover{box-shadow:0 5px 16px rgba(16,185,129,0.38);transform:translateY(-1px);}
        .rp-btn-stop{height:40px;padding:0 14px;border:none;border-radius:11px;background:rgba(239,68,68,0.12);color:var(--red);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.15s;white-space:nowrap;border:1px solid rgba(239,68,68,0.18);}
        .rp-btn-stop:hover{background:rgba(239,68,68,0.22);}
        .rp-back{display:none;}

        /* Weather */
        .rp-wx{margin:0 12px 10px;background:linear-gradient(135deg,#1e3a5f,#1d4ed8);border-radius:16px;padding:12px 16px;display:flex;align-items:center;gap:12px;color:#fff;flex-shrink:0;}
        .rp-wx-ico{font-size:2rem;}
        .rp-wx-body{flex:1;}
        .rp-wx-temp{font-size:1.5rem;font-weight:800;letter-spacing:-0.03em;}
        .rp-wx-desc{font-size:12px;opacity:.8;text-transform:capitalize;margin-top:1px;display:block;}
        .rp-wx-extra{display:flex;flex-direction:column;gap:2px;font-size:11.5px;opacity:.75;text-align:right;}

        /* Empty */
        .rp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;gap:10px;color:var(--text-light);text-align:center;flex:1;}
        .rp-empty-ico{font-size:3rem;opacity:.4;}
        .rp-empty-title{font-size:15px;font-weight:700;color:var(--text-secondary);}
        .rp-empty-sub{font-size:13px;line-height:1.5;max-width:220px;}

        /* Map */
        .rp-map-area{flex:1;position:relative;overflow:hidden;}
        .rp-map{width:100%;height:100%;}
        .rp-map-ctrl{position:absolute;bottom:100px;right:18px;display:flex;flex-direction:column;gap:8px;z-index:10;}
        .rp-map-btn{width:44px;height:44px;border-radius:14px;border:1.5px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.08);transition:all 0.18s cubic-bezier(0.16,1,0.3,1);}
        .rp-map-btn:hover{transform:scale(1.06);box-shadow:0 6px 20px rgba(0,0,0,0.14);border-color:var(--primary);}
        .rp-map-btn:active{transform:scale(0.96);}
        .rp-map-btn.on{background:var(--green-100,#eaf1eb);color:var(--primary,#4A7C59);border-color:var(--primary,#4A7C59);}
        .rp-map-btn.night{background:#1e293b;color:#fbbf24;border-color:rgba(255,255,255,0.15);}

        /* Google Maps Navigation Location Puck */
        .gm-traveller-puck{position:relative;width:26px;height:26px;pointer-events:none;}
        .gm-puck-halo{position:absolute;inset:-12px;border-radius:50%;background:rgba(37,99,235,0.25);animation:puckPulse 2.4s cubic-bezier(0.16,1,0.3,1) infinite;}
        .gm-puck-cone{position:absolute;top:-28px;left:-11px;width:48px;height:48px;background:radial-gradient(circle at 50% 100%,rgba(59,130,246,0.55) 0%,rgba(59,130,246,0) 72%);clip-path:polygon(50% 0%,14% 100%,86% 100%);transform-origin:50% 100%;transition:transform 0.12s linear;}
        .gm-puck-core{position:absolute;inset:0;border-radius:50%;background:#ffffff;box-shadow:0 4px 14px rgba(37,99,235,0.6),0 1px 3px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;border:3px solid #ffffff;}
        .gm-puck-inner{width:14px;height:14px;border-radius:50%;background:#2563eb;}
        @keyframes puckPulse{0%{transform:scale(0.85);opacity:0.85;}50%{transform:scale(1.4);opacity:0.3;}100%{transform:scale(1.8);opacity:0;}}

        /* Loading */
        .rp-loading{position:absolute;inset:0;background:rgba(15,25,40,0.9);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:500;animation:fadeIn 0.25s ease;}
        .rp-loading-card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:32px 40px;text-align:center;color:#fff;backdrop-filter:blur(20px);}
        .rp-ring{width:120px;height:120px;transform:rotate(-90deg);display:block;margin:0 auto 18px;}
        .rp-ring-bg{fill:none;stroke:rgba(255,255,255,0.08);stroke-width:8;}
        .rp-ring-fill{fill:none;stroke:url(#rg);stroke-width:8;stroke-linecap:round;stroke-dasharray:0 301.6;transition:stroke-dasharray 0.4s ease;}
        .rp-loading-leaf{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2.4rem;animation:leafSpin 2s ease-in-out infinite;}
        @keyframes leafSpin{0%,100%{transform:translate(-50%,-50%) rotate(-10deg) scale(1)}50%{transform:translate(-50%,-50%) rotate(10deg) scale(1.1)}}
        .rp-loading-pct{font-size:2rem;font-weight:800;letter-spacing:-0.04em;line-height:1;margin-bottom:5px;}
        .rp-loading-msg{font-size:14px;opacity:.7;}
        .rp-dots{display:flex;justify-content:center;gap:6px;margin-top:14px;}
        .rp-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.3);animation:dpulse 1.4s ease-in-out infinite;}
        .rp-dot:nth-child(2){animation-delay:.2s;background:rgba(52,211,153,.6);}
        .rp-dot:nth-child(3){animation-delay:.4s;}
        @keyframes dpulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}

        /* Modal */
        .rp-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;z-index:9000;animation:fadeIn 0.2s ease;}
        @media(min-width:640px){.rp-overlay{align-items:center;}}
        .rp-modal{background:var(--bg-secondary);border-radius:28px 28px 0 0;width:100%;max-width:480px;box-shadow:0 -8px 40px rgba(0,0,0,0.2);animation:slideUp2 0.3s cubic-bezier(0.4,0,0.2,1);padding-bottom:env(safe-area-inset-bottom,16px);}
        @media(min-width:640px){.rp-modal{border-radius:24px;animation:modalPop 0.25s cubic-bezier(0.4,0,0.2,1);}}
        @keyframes slideUp2{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .rp-modal-handle{width:36px;height:4px;background:var(--border-color);border-radius:2px;margin:12px auto 0;}
        @media(min-width:640px){.rp-modal-handle{display:none;}}
        .rp-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 12px;}
        .rp-modal-head h3{font-size:1.1rem;font-weight:800;color:var(--text-primary);letter-spacing:-0.02em;}
        .rp-modal-x{width:32px;height:32px;border-radius:50%;border:none;background:var(--bg-primary);color:var(--text-secondary);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
        .rp-modal-x:hover{background:var(--hover-bg);color:var(--text-primary);}
        .rp-modal-sub{font-size:13px;color:var(--text-secondary);padding:0 24px 16px;}
        .rp-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px 20px;}
        .rp-mode-btn{position:relative;display:flex;flex-direction:column;align-items:center;padding:18px 10px 15px;background:var(--bg-primary);border:2px solid transparent;border-radius:18px;cursor:pointer;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);font-family:inherit;}
        .rp-mode-btn:hover{background:var(--bg-secondary);border-color:var(--border-color);transform:translateY(-2px);box-shadow:0 5px 18px rgba(0,0,0,0.07);}
        .rp-mode-btn.on{background:var(--mbg,#ecfdf5);border-color:var(--mc,#10b981);box-shadow:0 4px 14px color-mix(in srgb,var(--mc) 18%,transparent);}
        .rp-mode-ico{font-size:2.2rem;margin-bottom:6px;}
        .rp-mode-name{font-size:14px;font-weight:700;color:var(--text-primary);}
        .rp-mode-desc{font-size:11.5px;color:var(--text-secondary);margin-top:2px;}
        .rp-mode-chk{position:absolute;top:9px;right:9px;width:20px;height:20px;background:var(--mc,#10b981);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;animation:chkPop 0.2s ease;}
        @keyframes chkPop{from{transform:scale(0)}to{transform:scale(1)}}
        .rp-modal-foot{display:flex;gap:10px;padding:0 20px 20px;border-top:1px solid var(--border-color);padding-top:16px;}
        .rp-modal-cancel{flex:1;height:48px;border-radius:14px;border:1.5px solid var(--border-color);background:var(--bg-primary);color:var(--text-secondary);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;}
        .rp-modal-cancel:hover{background:var(--hover-bg);}
        .rp-modal-ok{flex:2;height:48px;border-radius:14px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(16,185,129,0.32);transition:all 0.18s;}
        .rp-modal-ok:hover:not(:disabled){box-shadow:0 6px 20px rgba(16,185,129,0.42);transform:translateY(-1px);}
        .rp-modal-ok:disabled{opacity:.45;cursor:not-allowed;}

        /* Pins */
        .gm-pin-wrap{cursor:pointer;transition:transform 0.18s cubic-bezier(0.16,1,0.3,1);transform-origin:center bottom;}
        .gm-pin-wrap:hover{transform:scale(1.15);}
        .gm-pin-wrap svg{display:block;overflow:visible;}



        /* Toast */
        .rp-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:12px 22px;border-radius:50px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.25);animation:fadeIn 0.25s ease;white-space:nowrap;}

        /* Destination selection banner */
        .rp-dest-banner{position:absolute;top:20px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.92);backdrop-filter:blur(8px);border:1.5px solid rgba(255,255,255,0.15);border-radius:16px;padding:10px 18px;display:flex;align-items:center;gap:12px;z-index:999;box-shadow:0 10px 30px rgba(0,0,0,0.3);color:#fff;font-size:13px;font-weight:700;animation:rpSlideDown 0.3s cubic-bezier(0.16,1,0.3,1) forwards;white-space:nowrap;}
        .rp-dest-banner-icon{font-size:15px;}
        .rp-dest-banner-text{color:#fff;}
        .rp-dest-banner-btn{background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;transition:background 0.2s;}
        .rp-dest-banner-btn:hover{background:rgba(255,255,255,0.25);}
        @keyframes rpSlideDown{from{transform:translate(-50%,-20px);opacity:0;}to{transform:translate(-50%,0);opacity:1;}}

        /* Traffic legend */
        .rp-traffic-legend{position:absolute;bottom:110px;left:14px;background:var(--bg-glass);border:1px solid var(--border-color);border-radius:12px;padding:10px 14px;z-index:10;backdrop-filter:blur(8px);}
        .rp-traffic-legend-title{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:7px;}
        .rp-tl-row{display:flex;align-items:center;gap:7px;margin-bottom:4px;}
        .rp-tl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}

        @media(max-width:900px){
          .rp-shell{flex-direction:column;height:calc(100vh - 60px);width:100%;position:relative;overflow:hidden;}
          .rp-sidebar{width:100%!important;min-width:unset;height:auto!important;max-height:56vh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;border-right:none;border-bottom:1.5px solid var(--border-color);box-shadow:0 4px 16px rgba(0,0,0,0.06);flex-shrink:0;background:var(--bg-primary, #FBF9F4);}
          .rp-sidebar.dir-mode{max-height:68vh;}
          .rp-logo{display:none;}
          .rp-header{display:none;}
          .rp-carbon{display:none;}
          .rp-empty{display:none;}
          .rp-departure-wrap{display:none;}
          .rp-search{margin:6px 10px 6px;border-radius:16px;background:var(--bg-secondary, #FFFFFF);box-shadow:0 2px 10px rgba(0,0,0,0.04);}
          .rp-srow{min-height:40px;padding:0 10px;}
          .rp-geo-wrap .mapboxgl-ctrl-geocoder--input{height:38px!important;font-size:13px!important;}
          .rp-chips{padding:4px 10px 0;gap:5px;}
          .rp-chip{padding:4px 8px;font-size:11.5px;}
          .rp-cards{padding:6px 10px 12px;gap:6px;}
          .rp-map-area{flex:1;min-height:0;height:100%;width:100%;position:relative;}
          .rp-map-ctrl{bottom:${isNavigating?'90px':'16px'};right:12px;gap:6px;z-index:20;}
          .rp-map-btn{width:38px;height:38px;border-radius:12px;}
          .rp-resizer{display:none;}
          .rp-dir-head{padding:8px 10px 6px;}
          .rp-dir-top-bar{margin-bottom:6px;}
          .rp-step{padding:8px 10px;gap:8px;}
          .rp-step-ico{width:28px;height:28px;}
          .rp-step-inst{font-size:12px;}
          .rp-dir-title{font-size:12px;}
        }
      `}</style>

      <div className="rp-shell">

        {/* ═══ SIDEBAR ═══ */}
        {!isNavigating && (
          <aside className={`rp-sidebar ${panel === 'directions' ? 'dir-mode' : ''}`} style={{ width: sidebarWidth }}>

          {/* Header */}
          <div className="rp-header">
            <div className="rp-hrow">
              <div className="rp-logo">
                <span className="rp-logo-name" style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.3rem', color: 'var(--text-primary, #1C281F)' }}>
                  GreenRoute
                </span>
              </div>
              {/* Controls with sleek SVG icons */}
              <button className={`rp-hbtn ${traffic?'on':''}`} onClick={toggleTraffic} title="Toggle traffic (T)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </button>
              <button className={`rp-hbtn ${voiceOn?'on':''}`} onClick={()=>setVoiceOn(v=>!v)} title="Toggle voice (V)">
                {voiceOn
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                }
              </button>
              <button className={`rp-hbtn ${nightMode?'night':''}`} onClick={toggleNightMode} title="Toggle night mode">
                {nightMode
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </button>
              <button className="rp-hbtn" onClick={()=>setShowReport(true)} title="Eco report">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                </svg>
              </button>
              <button className="rp-hbtn" onClick={()=>setShowShortcuts(true)} title="Keyboard shortcuts (?)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="4"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M9 16h6"/>
                </svg>
              </button>
            </div>
            <div className="rp-carbon">
              <div className="rp-cs"><span className="rp-cv">{carbon.today.toFixed(1)}</span><span className="rp-cl">Today kg</span></div>
              <div className="rp-cdv"/>
              <div className="rp-cs"><span className="rp-cv">{carbon.month.toFixed(1)}</span><span className="rp-cl">Month kg</span></div>
              <div className="rp-cdv"/>
              <div className="rp-cs"><span className="rp-cv rp-cgoal">{carbon.pct.toFixed(0)}%</span><span className="rp-cl">Goal</span></div>
              <div className="rp-cbar-wrap"><div className="rp-cbar" style={{transform:`scaleX(${(carbon.pct || 0) / 100})`}}/></div>
            </div>

            {/* Segmented Pill Control Switcher */}
            {!routes.length && (
              <div style={{ display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 3, margin: '10px 14px 2px' }}>
                {[
                  { id: 'search', label: 'Route Engine' },
                  { id: 'recent', label: 'Recent' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSidebarTab(t.id)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: sidebarTab === t.id ? 'var(--bg-secondary, #fff)' : 'transparent',
                      color: sidebarTab === t.id ? 'var(--primary, #4A7C59)' : 'var(--text-secondary, #64748b)',
                      boxShadow: sidebarTab === t.id ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Search Summary Pill vs Tab Content */}
          {searchCollapsed && routes.length > 0 ? (
            <div style={{ padding: '0 14px 6px', flexShrink: 0 }}>
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: 16,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                boxShadow: 'var(--shadow-xs)'
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Active Route Query
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {origin?.name?.split(',')[0] || 'Start'} → {destination?.name?.split(',')[0] || 'Destination'}
                  </div>
                </div>
                <button
                  onClick={() => setSearchCollapsed(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: Route Engine */}
              {sidebarTab === 'search' && (
                <>
                  <div className="rp-departure-wrap">
                    <DepartureTime value={departureTime} onChange={setDepartureTime}/>
                  </div>

                  <div style={{padding:'0 0 4px',flexShrink:0}}>
                    <div className="rp-search">
                      {/* Section Title */}
                      <div style={{ padding: '12px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Plan Your Route
                        </span>
                      </div>

                      {/* Origin input */}
                      <div className="rp-srow">
                        <div className="rp-sdot" style={{ background: '#4A7C59', boxShadow: '0 0 0 3px rgba(74, 124, 89, 0.2)' }}/>
                        <div className="rp-geo-wrap" id="geocoder-origin"/>
                        <button
                          className="rp-gps-btn"
                          onClick={handleGpsClick}
                          title="Use current location"
                          type="button"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="3"/>
                            <line x1="12" y1="1" x2="12" y2="3"/>
                            <line x1="12" y1="21" x2="12" y2="23"/>
                            <line x1="1" y1="12" x2="3" y2="12"/>
                            <line x1="21" y1="12" x2="23" y2="12"/>
                          </svg>
                        </button>
                        <div className="rp-connector"/>
                      </div>

                      {/* Destination input */}
                      <div className="rp-srow">
                        <div className="rp-sdot" style={{ background: '#A16207', boxShadow: '0 0 0 3px rgba(161, 98, 7, 0.2)' }}/>
                        <div className="rp-geo-wrap" id="geocoder-dest"/>
                      </div>

                      {/* Mode Selector with Cool Modern Vector SVGs */}
                      <div style={{ display: 'flex', gap: 6, padding: '10px 14px 4px', overflowX: 'auto' }}>
                        {[
                          {
                            id: 'walking',
                            label: 'Walk',
                            icon: (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="4" r="2"/>
                                <path d="m15 7-3 4-2-2-4 3"/>
                                <path d="m6 16 3-2 3 5 4-3"/>
                              </svg>
                            )
                          },
                          {
                            id: 'cycling',
                            label: 'Bike',
                            icon: (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18.5" cy="17.5" r="3.5"/>
                                <circle cx="5.5" cy="17.5" r="3.5"/>
                                <circle cx="15" cy="5" r="1"/>
                                <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                              </svg>
                            )
                          },
                          {
                            id: 'driving',
                            label: 'Drive',
                            icon: (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.8 6 10.5 6H8.2C7.5 6 7 6.5 7 7.2v3.3C7 11.2 7.5 11.7 8.2 11.7h1.6c.7 0 1.2-.5 1.2-1.2V9M2 17h10c1.1 0 2-.9 2-2V9"/>
                                <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                              </svg>
                            )
                          },
                          {
                            id: 'transit',
                            label: 'Transit',
                            icon: (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="4" y="3" width="16" height="16" rx="2" ry="2"/>
                                <path d="M6 6h12v4H6ZM6 14h2v2H6ZM16 14h2v2h-2ZM8 19v2M16 19v2"/>
                              </svg>
                            )
                          },
                        ].map(m => {
                          const isSelected = modes.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setModes(prev => {
                                  if (prev.includes(m.id)) {
                                    if (prev.length === 1) return prev;
                                    return prev.filter(x => x !== m.id);
                                  } else {
                                    return [...prev, m.id];
                                  }
                                });
                              }}
                              style={{
                                flex: 1,
                                minWidth: 64,
                                height: 36,
                                borderRadius: 9999,
                                border: 'none',
                                background: isSelected ? 'var(--primary, #4A7C59)' : 'var(--bg-input, #F3EFE8)',
                                color: isSelected ? '#FFFFFF' : 'var(--text-secondary, #5F7163)',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                cursor: 'pointer',
                                transition: 'all 0.18s ease',
                                boxShadow: isSelected ? '0 2px 8px var(--primary-glow)' : 'none'
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center' }}>{m.icon}</span>
                              <span>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="rp-sfoot">
                        <button className="rp-swap" onClick={swap} disabled={!origin&&!destination} title="Swap Locations">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </button>
                        {(origin||destination)&&(
                          <button className="rp-clear" onClick={clearAll} title="Clear Inputs">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                        <button
                          className="rp-find"
                          onClick={() => {
                            if (origin && destination) {
                              planRoute();
                            } else {
                              alert('Please set both origin and destination.');
                            }
                          }}
                          disabled={loading}
                          style={{
                            background: 'var(--primary, #4A7C59)',
                            boxShadow: '0 4px 14px var(--primary-glow)'
                          }}
                        >
                          {loading
                            ? <><span className="rp-spin"/>Calculating...</>
                            : <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                                </svg>
                                Find Eco Route
                              </>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: Recent Journeys */}
              {sidebarTab === 'recent' && !routes.length && (
                <RecentRoutes onSelect={(r) => {
                  handleRecentSelect(r);
                  setSidebarTab('search');
                }}/>
              )}
            </>
          )}

          {/* Scroll content */}
          <div className="rp-scroll">

            {/* Route chips */}
            {routes.length>0&&(
              <div className="rp-chips">
                {Object.entries(MODE_META).map(([id,m])=>{
                  const r=routes.find(x=>x.mode===id); if(!r) return null;
                  const sel=selectedRoute?.mode===id;
                  return (
                    <button key={id} className={`rp-chip ${sel?'on':''}`} style={{'--cc':m.color}} onClick={()=>r&&selectRoute(r)}>
                      {m.label}
                      <span style={{opacity:.65}}> · {r.duration}m</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Route cards */}
            {panel!=='directions'&&routes.length>0&&(
              <div className="rp-cards">
                {/* CO2 comparison chart */}
                <Co2Chart routes={routes} selectedMode={selectedRoute?.mode}/>

                {routes.map((route,i)=>{
                  const m=MODE_META[route.mode]||{};
                  const sel=selectedRoute?.mode===route.mode;
                  const score=getEcoScore(route);
                  const eq=getCarbonEquivalent(parseFloat(route.co2Saved)||0);
                  const isGreenest = routes.reduce((min, cur) => parseFloat(cur.co2Saved) > parseFloat(min.co2Saved) ? cur : min, routes[0])?.mode === route.mode;

                  return (
                    <div 
                      key={route.id||i} 
                      className={`rp-card ${sel?'sel':''}`} 
                      style={{
                        '--cc': m.color,
                        background: sel ? 'var(--bg-secondary, #ffffff)' : 'var(--bg-primary, #f8fafc)',
                        border: sel ? `2px solid ${m.color}` : '1.5px solid var(--border-color)',
                        borderRadius: 20,
                        padding: '16px 18px',
                        boxShadow: sel ? `0 10px 30px color-mix(in srgb, ${m.color} 20%, transparent)` : '0 2px 10px rgba(0,0,0,0.03)',
                        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                      }} 
                      onClick={()=>selectRoute(route)}
                    >
                      {/* Route card header */}
                      <div className="rp-card-head" style={{ marginBottom: 12 }}>
                        <div className="rp-card-ico" style={{ width: 48, height: 48, borderRadius: 14, background: `color-mix(in srgb, ${m.color} 15%, var(--bg-secondary, #fff))`, border: `1.5px solid color-mix(in srgb, ${m.color} 30%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.6rem' }}>{m.icon}</span>
                        </div>
                        
                        <div className="rp-card-info" style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                          <div className="rp-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className="rp-card-name" style={{ fontSize: '1.05rem', fontWeight: 800 }}>{m.label}</span>
                            {isGreenest && (
                              <span style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--primary, #059669)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: '2px 9px', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                                Best Eco Choice
                              </span>
                            )}
                            {i===0 && !isGreenest && (
                              <span style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 20, padding: '2px 9px', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                                Fastest
                              </span>
                            )}
                          </div>
                          
                          <div className="rp-card-eta" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>
                            Arrives by <strong style={{ color: 'var(--text-primary)' }}>{route.estimatedArrival}</strong>
                          </div>
                        </div>

                        {/* Eco score ring */}
                        <EcoRing score={score}/>
                      </div>

                      {/* Main glanceable metrics bar */}
                      <div className="rp-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                            {route.duration} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>min</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distance</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                            {route.distance} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>km</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CO₂ Saved</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>
                            +{route.co2Saved} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>kg</span>
                          </span>
                        </div>
                      </div>

                      {/* Extra metrics: Calories, Fuel Savings, Trees */}
                      {sel && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {parseFloat(route.co2Saved) > 0 && (
                            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 5 }}>
                              🌳 {eq.trees} tree-days offset
                            </div>
                          )}
                          {route.calories > 0 && (
                            <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#ea580c', display: 'flex', alignItems: 'center', gap: 5 }}>
                              🔥 {route.calories} kcal burned
                            </div>
                          )}
                          {route.cost > 0 && (
                            <div style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 10, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: 5 }}>
                              💰 Est. ₹{route.cost} fuel
                            </div>
                          )}
                        </div>
                      )}

                      {/* Elevation profile (selected route, walking/cycling) */}
                      {sel&&elevData.length>0&&(route.mode==='walking'||route.mode==='cycling')&&(
                        <ElevationProfile data={elevData} color={m.color}/>
                      )}

                      {/* CTA Buttons */}
                      {sel&&(
                        <div className="rp-ctas" style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                          <button className="rp-go" style={{ '--cc': m.color, height: 46, borderRadius: 14, fontSize: '0.88rem', fontWeight: 800, whiteSpace: 'nowrap', flex: 2 }}
                            onClick={e=>{
                              e.stopPropagation();
                              startNav(route, true);
                            }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                            </svg>
                            Start Navigation
                          </button>
                          <button className="rp-dir-btn" style={{ height: 46, borderRadius: 14, fontSize: '0.88rem' }}
                            onClick={e=>{
                              e.stopPropagation();
                              setSelectedRoute(route);
                              setPanel('directions');
                              setIsNavigating(false);
                            }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="8" y1="6" x2="21" y2="6"/>
                              <line x1="8" y1="12" x2="21" y2="12"/>
                              <line x1="8" y1="18" x2="21" y2="18"/>
                              <line x1="3" y1="6" x2="3.01" y2="6"/>
                              <line x1="3" y1="12" x2="3.01" y2="12"/>
                              <line x1="3" y1="18" x2="3.01" y2="18"/>
                            </svg>
                            Steps
                          </button>
                          <button className={`rp-save ${saveMsg.includes('Saved')?'ok':''}`} style={{ width: 46, height: 46, borderRadius: 14 }}
                            onClick={e=>{e.stopPropagation();bookmarkDestination();}} title="Save to Places">
                            {saveMsg.includes('Saved')
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* AQI banner */}
            {aqi&&panel!=='directions'&&<AQIBanner aqi={aqi}/>}

            {/* Directions panel */}
            {panel==='directions'&&selectedRoute&&(()=>{
              const m=MODE_META[selectedRoute.mode]||{};
              const totalSteps=selectedRoute.steps?.length||0;
              const pct=activeStep!=null?Math.round((activeStep/Math.max(totalSteps-1,1))*100):0;
              return (
                <div className="rp-dir">
                  <div className="rp-dir-head">
                    {/* Top bar: back + route summary */}
                    <div className="rp-dir-top-bar">
                      <button className="rp-dir-back-inline" onClick={()=>setPanel('routes')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
                        Routes
                      </button>
                      <div className="rp-dir-sum">
                        <div className="rp-dir-mode-ico" style={{'--cc':m.color}}>{m.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="rp-dir-title">{origin?.name?.split(',')[0]} → {destination?.name?.split(',')[0]}</div>
                          <div className="rp-dir-meta">
                            <span className="rp-dir-meta-pill">{selectedRoute.duration} min</span>
                            <span className="rp-dir-meta-pill">{selectedRoute.distance} km</span>
                            <span className="rp-dir-meta-pill eco">🌿 {selectedRoute.co2Saved} kg saved</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="rp-dir-btns" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                        {isNavigating
                          ?<button className="rp-btn-stop" style={{ flex: 1 }} onClick={stopNav}>✕ Stop Navigation</button>
                          :<button className="rp-btn-go" style={{ flex: 1, '--cc':m.color }} onClick={()=>startNav(selectedRoute)}>▶ Start Navigation</button>
                        }
                      </div>
                      
                      {!isNavigating && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                          <input
                            type="checkbox"
                            checked={useGPS}
                            onChange={(e) => setUseGPS(e.target.checked)}
                            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            🛰️ Live GPS Mode (Arrival verified)
                          </span>
                        </label>
                      )}
                      
                      {isNavigating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: useGPS ? '#3b82f6' : 'var(--primary)', flex: 1 }}>
                            <span>{useGPS ? '🛰️ Live GPS Active' : '🏃 Simulating Journey...'}</span>
                          </div>
                          {useGPS && distToDest !== null && (
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                              <strong style={{ color: 'var(--text-primary)' }}>
                                {distToDest < 1000 ? `${Math.round(distToDest)}m` : `${(distToDest/1000).toFixed(1)}km`}
                              </strong>
                              {' · '}
                              <strong style={{ color: 'var(--text-primary)' }}>
                                {Math.max(1, Math.round(selectedRoute.duration * (distToDest / (parseFloat(selectedRoute.distance) * 1000 || 1)) || 0))} min
                              </strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isNavigating&&(
                      <div className="rp-nav-prog">
                        <div className="rp-npbar"><div className="rp-npfill" style={{transform:`scaleX(${animProgress || 0})`}}/></div>
                        <span className="rp-nptxt">{Math.round(animProgress*100)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Step count header */}
                  <div style={{padding:'10px 14px 6px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.07em'}}>
                      {totalSteps} Steps
                    </span>
                    {activeStep !== null && (
                      <span style={{fontSize:11,fontWeight:700,color:'var(--primary)'}}>
                        Step {activeStep+1} of {totalSteps}
                      </span>
                    )}
                  </div>

                  {/* Steps list */}
                  <div className="rp-steps" ref={el => {
                    if (el && activeStep !== null) {
                      const activeEl = el.querySelector('.rp-step.on');
                      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }}>
                    {selectedRoute.steps?.map((step,idx)=>(
                      <div key={idx} className={`rp-step ${activeStep===idx?'on':''}`} onClick={()=>focusStep(step,idx)}>
                        <div className="rp-step-ico">
                          <DirectionArrow
                            type={step.type}
                            modifier={step.modifier}
                            size={16}
                            color={activeStep===idx ? '#fff' : '#475569'}
                          />
                        </div>
                        <div className="rp-step-body">
                          <div className="rp-step-inst">{step.instruction}</div>
                          <div className="rp-step-dist">
                            {step.distance>0&&<span className="rp-step-dist-badge">{formatDist(step.distance)}</span>}
                            {step.duration>0&&<span style={{color:'var(--text-muted)',fontSize:11}}>{formatDur(step.duration)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="rp-step rp-step-arrive">
                      <div className="rp-step-ico">
                        <DirectionArrow type="arrive" size={16} color="#10b981" />
                      </div>
                      <div className="rp-step-body">
                        <div className="rp-step-inst">Arrive at {destination?.name?.split(',')[0]}</div>
                        <div className="rp-step-dist" style={{color:'#10b981',fontWeight:600}}>You've reached your destination 🎉</div>
                      </div>
                    </div>
                  </div>
                  <button className="rp-back" onClick={()=>setPanel('routes')}>← Back to Routes</button>
                </div>
              );
            })()}

            {/* Empty state */}
            {routes.length===0&&!loading&&(
              <div className="rp-empty">
                <div className="rp-empty-ico">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                    <line x1="9" y1="3" x2="9" y2="18"/>
                    <line x1="15" y1="6" x2="15" y2="21"/>
                  </svg>
                </div>
                <div className="rp-empty-title">Plan your eco journey</div>
                <div className="rp-empty-sub">Enter a start and destination to compare eco-friendly routes</div>
                <div style={{fontSize:11,color:'#cbd5e1',marginTop:8}}>Press <kbd style={{background:'#f1f5f9',padding:'2px 6px',borderRadius:5,fontSize:11,border:'1px solid #e2e8f0'}}>?</kbd> for shortcuts</div>
              </div>
            )}

            {/* Weather */}
            {weather&&routes.length>0&&panel!=='directions'&&(
              <div className="rp-wx">
                <div style={{flexShrink:0,textAlign:'center',minWidth:44}}>
                  <div style={{fontSize:'1.4rem',fontWeight:800,letterSpacing:'-0.02em'}}>{Math.round(weather.main?.temp)}°</div>
                  <div style={{fontSize:9,opacity:.7,textTransform:'uppercase',letterSpacing:'0.07em',marginTop:1}}>{wxIcon(weather.weather?.[0]?.icon)}</div>
                </div>
                <div className="rp-wx-body">
                  <span className="rp-wx-temp" style={{fontSize:'1rem'}}>{weather.weather?.[0]?.description}</span>
                </div>
                <div className="rp-wx-extra">
                  <span>Humidity {weather.main?.humidity}%</span>
                  <span>Wind {Math.round((weather.wind?.speed||0)*3.6)} km/h</span>
                  <span>Vis. {Math.round((weather.visibility||0)/1000)} km</span>
                </div>
              </div>
            )}
          </div>
        </aside>
        )}
        {!isNavigating && <div className="rp-resizer" onMouseDown={startResizing} />}

        {/* ═══ MAP ═══ */}
        <main className="rp-map-area">
          <div ref={mapContainer} className="rp-map"/>

          {mapSelectDestMode && (
            <div className="rp-dest-banner">
              <span className="rp-dest-banner-icon">📍</span>
              <span className="rp-dest-banner-text">Click on the map to set your destination</span>
              <button 
                className="rp-dest-banner-btn"
                onClick={() => setMapSelectDestMode(false)}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Floating turn card — shown during navigation */}
          <NavTurnCard
            step={selectedRoute?.steps?.[activeStep ?? 0]}
            nextStep={selectedRoute?.steps?.[activeStep != null ? activeStep + 1 : 1]}
            isNavigating={isNavigating}
            progress={animProgress}
            totalSteps={selectedRoute?.steps?.length ?? 0}
            voiceOn={voiceOn}
            onToggleVoice={() => setVoiceOn(v => !v)}
          />

          {/* Nav strip — bottom bar */}
          <NavStrip
            route={selectedRoute}
            progress={animProgress}
            isNavigating={isNavigating}
            onStop={stopNav}
            activeStep={activeStep}
            onRecenter={recenterCamera}
            voiceOn={voiceOn}
            onToggleVoice={() => setVoiceOn(v => !v)}
          />

          {/* Traffic legend */}
          {traffic&&(
            <div className="rp-traffic-legend">
              <div className="rp-traffic-legend-title">Traffic</div>
              {[['#22c55e','Free flow'],['#f59e0b','Moderate'],['#ef4444','Heavy'],['#7f1d1d','Severe']].map(([c,l])=>(
                <div key={l} className="rp-tl-row">
                  <div className="rp-tl-dot" style={{background:c}}/>
                  <span style={{fontSize:11,color:'#475569',fontWeight:500}}>{l}</span>
                </div>
              ))}
            </div>
          )}

          {/* Map controls */}
          <div className="rp-map-ctrl">
            {/* Locate Me FAB */}
            <button className="rp-map-btn" onClick={handleLocateMe} title="My live location">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="7"/>
                <line x1="12" y1="1" x2="12" y2="4"/>
                <line x1="12" y1="20" x2="12" y2="23"/>
                <line x1="1" y1="12" x2="4" y2="12"/>
                <line x1="20" y1="12" x2="23" y2="12"/>
              </svg>
            </button>

            {/* 3D / 2D Perspective Toggle */}
            <button className={`rp-map-btn ${is3D ? 'on' : ''}`} onClick={toggle3D} title={is3D ? "Switch to 2D view" : "Switch to 3D perspective"}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>{is3D ? '2D' : '3D'}</span>
            </button>

            {/* Map style toggle */}
            <button className={`rp-map-btn ${mapStyle==='satellite-streets-v12'?'on':''}`} onClick={toggleStyle} title="Toggle satellite layer">
              {mapStyle==='satellite-streets-v12'
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              }
            </button>

            {/* Traffic layer toggle */}
            <button className={`rp-map-btn ${traffic?'on':''}`} onClick={toggleTraffic} title="Toggle real-time traffic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/></svg>
            </button>

            {/* Night mode toggle */}
            <button className={`rp-map-btn ${nightMode?'night':''}`} onClick={toggleNightMode} title="Toggle night mode">
              {nightMode
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border-color)' }}>
              <button className="rp-map-btn" onClick={handleZoomIn} title="Zoom in">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button className="rp-map-btn" onClick={handleZoomOut} title="Zoom out">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ═══ TRANSPORT MODAL ═══ */}
      {showModal&&(
        <div className="rp-overlay" onClick={()=>setShowModal(false)}>
          <div className="rp-modal" onClick={e=>e.stopPropagation()}>
            <div className="rp-modal-handle"/>
            <div className="rp-modal-head">
              <h3>Choose Transport</h3>
              <button className="rp-modal-x" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <p className="rp-modal-sub">Select modes to compare. All routes shown on map simultaneously.</p>
            <div className="rp-mode-grid">
              {Object.entries(MODE_META).map(([id,m])=>(
                <button key={id} className={`rp-mode-btn ${modes.includes(id)?'on':''}`}
                  style={{'--mc':m.color,'--mbg':m.bg}}
                  onClick={()=>setModes(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])}>
                  <span className="rp-mode-ico">{m.icon}</span>
                  <span className="rp-mode-name">{m.label}</span>
                  <span className="rp-mode-desc">{m.desc}</span>
                  {modes.includes(id)&&<span className="rp-mode-chk">✓</span>}
                </button>
              ))}
            </div>
            <div className="rp-modal-foot">
              <button className="rp-modal-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="rp-modal-ok" onClick={planRoute} disabled={modes.length===0}>Find Routes →</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ OVERLAYS ═══ */}
      {showReport&&<EcoReport history={history} goal={carbon.goal} onClose={()=>setShowReport(false)}/>}
      {showShortcuts&&<ShortcutsModal onClose={()=>setShowShortcuts(false)}/>}

      {showArrivalModal && completedTrip && (
        <div className="rp-overlay" style={{ zIndex: 9999 }}>
          <div className="rp-modal" style={{ maxWidth: 440, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#10b981', boxShadow: '0 8px 24px rgba(16,185,129,0.2)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              Destination Reached!
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Congratulations! Your score has been registered on the leaderboard.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: 'var(--bg-primary)', padding: 14, borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{completedTrip.co2Saved.toFixed(2)}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>kg saved</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{completedTrip.distance.toFixed(1)}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>km traveled</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{completedTrip.duration}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>min</div>
              </div>
            </div>
            

            
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowArrivalModal(false); setCompletedTrip(null); }}
                style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Done
              </button>
              <button
                onClick={() => {
                  setShowArrivalModal(false);
                  setCompletedTrip(null);
                  window.location.href = '/leaderboard';
                }}
                style={{ flex: 2, height: 46, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
              >
                View Leaderboard →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {saveMsg&&(
        <div className="rp-toast">
          {saveMsg.includes('Saved') || saveMsg === 'Already saved!'
            ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> {saveMsg}</>
            : saveMsg==='error'
            ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Save failed</>
            : saveMsg}
        </div>
      )}
    </>
  );
};

export default RoutePlanner;