import {GlassShell} from "./GlassShell.tsx";
import {focusLabels,type FocusTarget} from "../scene/focus-flight.ts";
import {cityPreview,reviewViews} from "../scene/city/preview.ts";
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createReplay } from "../core/replay.ts";
import {
  HARBOR_FIGURE_LIMIT, HARBOR_VEHICLE_LIMIT, KCAL_PER_MINUTE_PER_VEHICLE,
  STEPS_PER_FIGURE, lastEndedReplayDate, recordedReplayDay, stepsAt, SYNTHETIC_DAYS, trafficAt,
} from "../core/representative-day.ts";
import { VoyageChart } from "./VoyageChart.tsx";
import { SleepDetails,sleepFormatter,sleepLabel } from "./SleepDetails.tsx";
import { arrivalDate,departure,departureDate,voyage } from "../scene/sleep-voyage.ts";
import { asleepSeconds, daySleepVoyages, voyageAt, type SleepSpan } from "../core/sleep-replay.ts";
import { SYNTHETIC_SESSION } from "../scene/sleep/session.ts";
import { deriveHrvSkyline, thresholdMs } from "../core/skyline.ts";
import { isTowerView, skylineDisplay, TOWER_DESIGNS } from "../scene/skyline-layout.ts";
import type { CameraCommand, ReviewView, TowerDesignId } from "../scene/skyline-layout.ts";
import type { HrvSource } from "../core/daily-hrv.ts";
import type { ReplayDay } from "../core/representative-day.ts";
import { canonicalRhr } from "../core/rhr.ts";
import { useDayReplay } from "./use-day-replay.ts";

const BoatScene = lazy(() => import("../scene/BoatScene.tsx"));

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onFailure(); }
  render() {
    return this.state.failed
      ? <div className="scene-message" role="alert"><h2>The harbor scene could not load</h2>
        <p>Check that graphics acceleration is enabled. Reload this page to retry.</p></div>
      : this.props.children;
  }
}

export function App() {
  const [{ day: selectedDay, replay, source }, setReplayDay] = useState(() => {
    const day = SYNTHETIC_DAYS[0];
    const replay=createReplay(day.durationSeconds);
    if(cityPreview)replay.seek(9*3600+5*60+45);
    return { day, replay, source: "synthetic" as HrvSource };
  });
  const clock = useSyncExternalStore(replay.subscribe, replay.read);
  const timeLabel = selectedDay.replayLabel(clock.seconds);
  const dayRequest = useDayReplay(source, selectedDay,!reviewViews);
  const loadState = dayRequest.state;
  const recorded = loadState.status === "ready" ? loadState.recorded : undefined;
  const day = useMemo(() => recorded ? {
    ...selectedDay,
    heartMeans:recorded.heartRate.status==="ready"?recorded.heartRate.value:selectedDay.heartMeans,
    stepTotals: recorded.steps.status === "ready" ? recorded.steps.value : selectedDay.stepTotals,
    calorieTotals: recorded.calories.status === "ready" ? recorded.calories.value : selectedDay.calorieTotals,
  } : selectedDay, [recorded, selectedDay]);
  const hrv = deriveHrvSkyline(loadState.status === "ready" ? loadState.rmssdMs : null);
  const district = skylineDisplay(hrv);
  const usingExamples = source === "synthetic";
  const [selectedSleepId, setSelectedSleepId] = useState<string>();
  const [wakeRecord, setWakeRecord] = useState<{id:string; span:SleepSpan}>();
  const sleepStream = recorded?.sleep;
  const sleepVoyages = useMemo(() => {
    const sessions = usingExamples
      ? day.date === departureDate || day.date === arrivalDate ? [SYNTHETIC_SESSION] : []
      : sleepStream?.status === "ready" ? sleepStream.value : [];
    return daySleepVoyages(sessions, day.date, day.zone);
  }, [day.date, day.zone, sleepStream, usingExamples]);
  const sleep = voyageAt(sleepVoyages, clock.seconds, selectedSleepId);
  const hasIsland = !!sleep && asleepSeconds(sleep.session)>0;
  const journey = voyage(sleep, clock.seconds);
  const loadMessage = {
    idle: "Choose a date and load the day.",
    loading: "Loading day…",
    "sign-in": "Sign in to load this day.",
    renew: "Renew Google authorization to load this day.",
    error: "Could not load this day.",
    ready: "Day loaded.",
  }[loadState.status];
  const sleepStatus = sleep ? sleepLabel(journey.stage) + (usingExamples ? " · Synthetic sleep" : " · Google Health")
    : usingExamples ? "Demo voyage · Nov 11–12"
    : loadState.status !== "ready" ? loadMessage
    : sleepStream?.status === "ready" ? "No sleep record" : "Sleep read failed";
  const failedStreams = recorded && [
    recorded.heartRate.status === "failed" && "heart rate", recorded.hrv.status === "failed" && "HRV", recorded.steps.status === "failed" && "steps",
    recorded.calories.status === "failed" && "total energy", recorded.rhr.status === "failed" && "resting heart rate", recorded.sleep.status === "failed" && "sleep",
  ].filter(Boolean);
  const hrvStatus = loadState.status !== "ready" ? loadMessage
    : recorded?.hrv.status === "failed" ? "HRV read failed" : "No HRV data";
  const activity = stepsAt(day, clock.seconds);
  const stepLabel = recorded?.steps.status === "failed" ? "Step read failed"
    : activity.steps === null ? "No step data" : activity.steps + " steps";
  const traffic = trafficAt(day, clock.seconds);
  const energyLabel = recorded?.calories.status === "failed" ? "Energy read failed"
    : traffic.meanKcalPerMinute === null ? "No calorie data" : traffic.meanKcalPerMinute.toFixed(2) + " kcal/min";
  const [night, setNight] = useState(import.meta.env.DEV&&new URLSearchParams(location.search).get("lighting")==="night");
  const [selected, setSelected] = useState<"chart" | "wake" | "sleep" | "heart" | "boat" | "skyline" | "steps" | "traffic" | "rhr" | TowerDesignId | number | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>(() => ({ view: cityPreview && new URLSearchParams(window.location.search).get("view")==="harbor" ? "harbor" : reviewViews?"skyline":"world", revision: 0, districtRows: 1 }));
  const [graphicsLost, setGraphicsLost] = useState(false);
  const [boatReady, setBoatReady] = useState(false);
  const [berthReady, setBerthReady] = useState(false);
  const [skylineReady, setSkylineReady] = useState(false);
  const [walkReady, setWalkReady] = useState(false);
  const [roadReady, setRoadReady] = useState(false);
  const sceneReady = boatReady && berthReady && skylineReady && walkReady && roadReady;
  const onBoatReady = useCallback(() => setBoatReady(true), []);
  const onBerthReady = useCallback(() => setBerthReady(true), []);
  const onSkylineReady = useCallback(() => setSkylineReady(true), []);
  const onWalkReady = useCallback(() => setWalkReady(true), []);
  const onRoadReady = useCallback(() => setRoadReady(true), []);
  const onGraphicsLost = useCallback(() => { replay.pause(); setGraphicsLost(true); }, [replay]);
  const [heartPinned,setHeartPinned]=useState(false);
  const [heartSpan,setHeartSpan]=useState([0,1] as [number,number]);
  const heartMean = day.heartMeans[heartSpan[0]];
  const focusCamera=(view:FocusTarget)=>{
    if(!reviewViews)setCameraCommand(prev=>({...prev,view,revision:prev.revision+1}));
  };
  function openFocus(view:FocusTarget){
    if(view!=="world")replay.pause();
    setHeartPinned(false);focusCamera(view);
    if(view==="heart"){const i=Math.min(day.heartMeans.length-1,Math.floor(clock.seconds/300));setHeartSpan([i,i+1]);}
    setSelected(({world:null,sleep:"sleep",hrv:"skyline",heart:"heart",rhr:"rhr",steps:"steps",energy:"traffic"} as const)[view]);
  }
  const selectHeart=(a:number,b:number)=>{replay.pause();setHeartPinned(true);focusCamera("heart");setHeartSpan([a,b]);setSelected("heart")};
  const heartReady=usingExamples||recorded?.heartRate.status==="ready";
  const heartStatus=heartReady?(recorded?.cachedHeartRate?"Cached Google Health":usingExamples?"Synthetic data":"Google Health"):loadState.status==="ready"?"Heart-rate read failed":loadMessage;
  const ridgeView=(cameraCommand.view==="ridge"||cameraCommand.view==="heart");
  const sleepView=cameraCommand.view.startsWith("sleep");
  const chartOpen=selected==="chart" && !!sleep;
  const sleepContext=sleepView||chartOpen;
  const selectSleep = (id:string) => {
    setSelectedSleepId(id || undefined);
    const entry = sleepVoyages.find(item => item.session.id === id);
    if (!entry) return;
    replay.pause();
    replay.seek(Math.max(0, -entry.offset));
    if (selected === "wake") setSelected("sleep");
  };
  const inspectButton=useRef<HTMLButtonElement>(null);
  const openChart=()=>{replay.pause();setSelected("chart");};
  const closeChart=useCallback(()=>{
    setSelected(null);
    requestAnimationFrame(()=>inspectButton.current?.focus({preventScroll:true}));
  },[]);
  const showDeparture=()=>{
    const first=SYNTHETIC_DAYS.find(item=>item.date===departureDate)!;
    const next=createReplay(first.durationSeconds);
    next.setSpeed(replay.read().speed);next.seek(departure);replay.pause();
    setReplayDay({day:first,replay:next,source:"synthetic"});setSelected(null);
    setCameraCommand(previous=>({...previous,view:"sleep",revision:previous.revision+1}));
  };
  useEffect(()=>{
    if(!sleepContext || !usingExamples || day.date!==departureDate)return;
    let playing=replay.read().playing;
    return replay.subscribe(()=>{
      const current=replay.read();
      if(playing && !current.playing && current.seconds===replay.durationSeconds){
        const nextDay=SYNTHETIC_DAYS.find(item=>item.date===arrivalDate)!;
        const next=createReplay(nextDay.durationSeconds);next.setSpeed(current.speed);next.play();
        setReplayDay({day:nextDay,replay:next,source:"synthetic"});setSelected(previous=>previous==="chart"||(!reviewViews&&previous==="sleep")?previous:null);
      }
      playing=current.playing;
    });
  },[sleepContext,usingExamples,day.date,replay]);
  const selectBoat = () => { replay.pause(); setSelected("boat"); };
  const selectTower = (design: TowerDesignId) => { replay.pause(); setSelected(design); };
  const selectPlot = (id:number) => { replay.pause(); setSelected(id); };
  const selectSkyline = () => { replay.pause(); setSelected("skyline"); };
  const selectSteps = () => { replay.pause(); setSelected("steps"); };
  const selectTraffic = () => { replay.pause(); setSelected("traffic"); };
  const switchDay = (nextDay: ReplayDay, nextSource: HrvSource) => {
    if (day.date === nextDay.date && source === nextSource) return;
    const nextReplay = createReplay(nextDay.durationSeconds);
    nextReplay.setSpeed(replay.read().speed);
    replay.pause();
    setHeartPinned(false);
    if(reviewViews || nextSource!==source){
      focusCamera("world");setSelected(null);
    }
    setReplayDay({ day: nextDay, replay: nextReplay, source: nextSource });
    setSelectedSleepId(undefined);
  };
  const selectDate = (date: string) => {
    if (usingExamples) {
      const nextDay = SYNTHETIC_DAYS.find(item => item.date === date);
      if (nextDay) switchDay(nextDay, source);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= "0001-01-01" && date <= lastEndedReplayDate()) {
      switchDay(recordedReplayDay(date), source);
    }
  };
  const setView = (view: ReviewView) => {
    setCameraCommand(previous => ({ view, revision: previous.revision + 1, districtRows: district.rows }));
    if (isTowerView(view)||chartOpen) setSelected(null);
  };
  const focusedTower = TOWER_DESIGNS.find(design => design.id === cameraCommand.view);
  const selectedTower = TOWER_DESIGNS.find(design => design.id === selected);
  const walkView = (cameraCommand.view === "walk"||cameraCommand.view==="steps");
  const roadView = (cameraCommand.view === "road"||cameraCommand.view==="energy");
  const inspectWalk = walkView || cameraCommand.view === "square" || cameraCommand.view === "side";
  const skylineView = cameraCommand.view==="hrv" || !!focusedTower || cameraCommand.view === "skyline" || cameraCommand.view === "world";
  const inspectFocus = () => {
    if(sleepView){if(!sleep&&usingExamples){showDeparture();return;}replay.pause();setSelected(sleep?"sleep":"boat");}
    else if (ridgeView) { const i=Math.min(day.heartMeans.length-1,Math.floor(clock.seconds/300));selectHeart(i,i+1); }
    else if (focusedTower) selectTower(focusedTower.id);
    else if (skylineView) selectSkyline();
    else if (inspectWalk) selectSteps();
    else if (roadView) selectTraffic();
    else selectBoat();
  };
  const inspectLabel = sleepView?"Inspect sleep voyage":ridgeView?"Inspect heart rate":focusedTower ? "Inspect tower" : skylineView ? "Inspect skyline" : inspectWalk ? "Inspect steps"
    : roadView ? "Inspect traffic" : "Inspect boat";
  const sceneTitle = sleepView?(cameraCommand.view==="sleep-island"?"Sleep island":"Sleep voyage"):ridgeView?"Heart-rate mountains":focusedTower ? focusedTower.name : skylineView ? "HRV skyline"
    : walkView ? "Market crossing" : roadView ? "Market Avenue" : cameraCommand.view === "square" ? "Civic plaza" : cameraCommand.view === "side" ? "Orchard Lane" : cameraCommand.view === "berth" ? "Working quay" : "Working harbor";

  useEffect(() => {
    const visibility = () => { if (document.hidden) replay.pause(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); replay.pause(); };
  }, [replay]);

  const rhr=canonicalRhr(usingExamples?day.rhr:recorded?.rhr.status==="ready"?recorded.rhr.value:[]);
  const scene=(<div className="scene-canvas" data-testid="scene-canvas">
        <SceneBoundary onFailure={onGraphicsLost}>
          <Suspense fallback={<div className="scene-message" role="status">Loading the harbor…</div>}>
            <BoatScene rhrBpm={rhr.status==="value"?rhr.bpm:null} sleep={sleep} cardOpen={selected} onSteps={()=>openFocus("steps")} onEnergy={()=>openFocus("energy")} onRhr={()=>openFocus("rhr")} onIsland={()=>reviewViews?openChart():openFocus("sleep")} onWake={span=>{if(sleep){replay.pause();focusCamera("sleep");setWakeRecord({id:sleep.session.id,span});setSelected("wake");}}} onHeart={selectHeart} heartReady={!!heartReady} replay={replay} day={day} night={night} cameraCommand={cameraCommand} hrv={hrv}
              onSelect={reviewViews?(sleep && !cityPreview?openChart:selectBoat):()=>openFocus("sleep")} onGraphicsLost={onGraphicsLost}
              onBoatReady={onBoatReady} onBerthReady={onBerthReady}
              onSkylineReady={onSkylineReady} onWalkReady={onWalkReady}
              onRoadReady={onRoadReady} onSelectTower={reviewViews?selectTower:()=>openFocus("hrv")} onPlot={reviewViews?selectPlot:()=>openFocus("hrv")} />
          </Suspense>
        </SceneBoundary>
      </div>);
  if(!reviewViews)return <GlassShell day={day} replay={replay} clock={clock} focus={cameraCommand.view as FocusTarget} open={selected!==null}
    choose={openFocus} close={()=>setSelected(null)} date={selectDate} source={synthetic=>switchDay(synthetic?SYNTHETIC_DAYS[0]:recordedReplayDay(lastEndedReplayDate()),synthetic?"synthetic":"google-health")}
    refresh={()=>void dayRequest.load()} synthetic={usingExamples} google={dayRequest.googleHealthEnabled} recorded={recorded}
    rmssd={loadState.status==="ready"?loadState.rmssdMs:null} towers={hrv.status==="available"?hrv.buildingCount:null} load={loadState.status}
    ready={sceneReady} lost={graphicsLost} night={night} failures={(failedStreams??[]).filter((v):v is string=>typeof v==="string")}
    sleep={sleep} sessions={sleepVoyages} selectSession={selectSleep} wake={selected==="wake"?wakeRecord?.span:undefined}
    interval={selected==="heart"&&heartPinned?heartSpan:undefined}>{scene}</GlassShell>;

  return <main className={night ? "app night" : "app"}>
    <header className="app-header">
      <a className="brand" href="/" aria-label="HealthCity home"><span className="brand-mark" aria-hidden="true">≈</span>HealthCity</a>
      {dayRequest.googleHealthEnabled || !usingExamples ? <label className="data-label">
        <span className="sr-only">Replay source</span>
        <select value={source} onChange={event => {
          const nextSource = event.target.value as HrvSource;
          switchDay(nextSource === "synthetic" ? SYNTHETIC_DAYS[0] : recordedReplayDay(lastEndedReplayDate()), nextSource);
        }}>
          <option value="synthetic">Synthetic data</option>
          <option value="google-health">Google Health</option>
        </select>
      </label> : <span className="data-label"><span aria-hidden="true" />Synthetic data</span>}
      <a className="account-link" href="/auth/status">Account</a>
    </header>

    <section className={(chartOpen?"world has-chart":"world")+(reviewViews?"":" focus-world")} aria-label="Interactive HealthCity scene">
      <div className={sleepView ? "scene-heading voyage-scene-heading" : inspectWalk || roadView ? "scene-heading harbor-activity-heading" : "scene-heading"}>
        <h1>{cityPreview ? cameraCommand.view==="walk"?"Market crossing":cameraCommand.view==="detail"?"Working boat":cameraCommand.view==="world"?"City overview":cameraCommand.view==="skyline"?"Waterfront block":sceneTitle : reviewViews?sceneTitle:focusLabels[cameraCommand.view as FocusTarget]}</h1>
        {sleepView && <p>{sleepStatus}</p>}
        {sleepView && !sleep && usingExamples && <button onClick={showDeparture}>View Nov 11 departure</button>}
        {ridgeView && <p>{heartReady && day.heartMeans.every(v=>v===null)?"No heart-rate data":heartStatus}</p>}
        {focusedTower && <p>{focusedTower.style + " · Design preview"}</p>}
        {skylineView && (reviewViews||cameraCommand.view==="hrv") && <p className="skyline-summary">{hrv.status === "available"
          ? (usingExamples ? "Synthetic daily HRV " : "Daily HRV ") + hrv.rmssdMs.toFixed(2) + " ms · " + hrv.buildingCount + " buildings"
          : hrvStatus}</p>}
        {skylineView && district.overflow && <p className="skyline-summary">Showing {district.visibleCount} buildings in this district.</p>}
      </div>
      {scene}
      {!sceneReady && !graphicsLost && <p className="asset-status" role="status">Loading harbor…</p>}

      <div className="view-controls" aria-label="View controls">
        {reviewViews?<><button onClick={() => setView("world")}>World view</button>
        <label className="view-picker"><span className="sr-only">Scene view</span>
          <select aria-label="Scene view" value={cameraCommand.view} onChange={event => setView(event.target.value as ReviewView)}>
            {cityPreview?<><option value="world">World overview</option><option value="skyline">Waterfront block</option><option value="walk">Market crossing</option><option value="harbor">Harbor view</option><option value="berth">Working quay</option><option value="detail">Working boat</option></>:<>
            <option value="sleep">Sleep voyage</option><option value="sleep-island" disabled={!usingExamples && !hasIsland}>Sleep island</option>
            <option value="ridge">Heart-rate mountains</option>
            <option value="world">World overview</option>
            <option value="skyline">Skyline overview</option>
            <optgroup label="Tower designs">
              {TOWER_DESIGNS.map(design => <option key={design.id} value={design.id}>{design.name}</option>)}
            </optgroup>
            <optgroup label="Harbor">
              <option value="harbor">Harbor view</option>
              <option value="walk">Market crossing</option>
              <option value="road">Market Avenue</option>
              <option value="square">Civic plaza</option>
              <option value="side">Orchard Lane</option>
              <option value="detail">Boat detail</option>
              <option value="berth">Working quay</option>
            </optgroup></>}
          </select>
        </label>
        </>:<nav className="focus-chips" aria-label="Camera focus">
          {(Object.keys(focusLabels) as FocusTarget[]).map(view=><button key={view} aria-pressed={cameraCommand.view===view} onClick={()=>openFocus(view)}>{focusLabels[view]}</button>)}
        </nav>}
        <fieldset className="lighting-controls"><legend className="sr-only">Review lighting</legend>
          <button aria-pressed={!night} onClick={() => setNight(false)}>Day</button>
          <button aria-pressed={night} onClick={() => setNight(true)}>Night</button>
        </fieldset>
      </div>

      {selected==="rhr" && <aside className="record-card" aria-label="Resting heart rate"><div className="card-heading"><h2>Resting heart rate</h2><button aria-label="Close resting heart rate" onClick={()=>setSelected(null)}>×</button></div><p>Reservoir site preview</p></aside>}
      {selected==="sleep"&&!sleep && <aside className="record-card" aria-label="Sleep voyage"><div className="card-heading"><h2>Sleep voyage</h2><button aria-label="Close sleep details" onClick={()=>setSelected(null)}>×</button></div><p>{sleepStatus}</p></aside>}
      {selected === "heart" && <aside className="record-card" aria-label="Heart-rate interval"><div className="card-heading"><h2>Heart rate</h2><button aria-label="Close heart rate" onClick={()=>setSelected(null)}>×</button></div>
        <p>{day.replayLabel(heartSpan[0]*300)} – {day.replayLabel(heartSpan[1]*300)}</p>
        <p>{heartReady?(heartMean==null?"No heart-rate data":heartMean.toFixed(2)+" bpm · Five-minute mean"):heartStatus}</p>
        {heartReady && <p>{heartStatus}</p>}</aside>}
      {sleep && (selected==="wake"||selected==="sleep") &&
        <SleepDetails reviewWake={reviewViews} sleep={sleep} synthetic={usingExamples}
          wake={selected==="wake"&&wakeRecord?.id===sleep.session.id?wakeRecord.span:undefined}
          close={()=>setSelected(null)} depart={usingExamples?showDeparture:undefined} openChart={openChart}/>}
      {chartOpen && sleep && <VoyageChart key={sleep.session.id} sleep={sleep} time={clock.seconds+sleep.offset} close={closeChart}/>}
      {selected === "boat" && <aside className="record-card" aria-labelledby="boat-title">
        <div className="card-heading"><h2 id="boat-title">The harbor boat</h2><button aria-label="Close boat details" onClick={() => setSelected(null)}>×</button></div>
        <p>A working vessel for HealthCity’s sleep journeys.</p>
        <dl><div><dt>Current scene</dt><dd>{sleepLabel(journey.stage)}</dd></div>
          <div><dt>Movement</dt><dd>Synthetic boat and water motion</dd></div>
          <div><dt>Sleep records</dt><dd>{sleepStatus}</dd></div></dl>
        {usingExamples && <button onClick={()=>{if(!sleep)showDeparture();else{setSelected(null);setView("sleep")}}}>Follow sleep voyage</button>}
      </aside>}
      {selected === "steps" && <aside className="record-card" aria-labelledby="steps-title">
        <div className="card-heading"><h2 id="steps-title">Harbor steps</h2>
          <button aria-label="Close step details" onClick={() => setSelected(null)}>×</button></div>
        <dl>
          <div><dt>Replay interval</dt><dd>{day.replayLabel(activity.startSeconds)}–{day.replayLabel(activity.endSeconds)}</dd></div>
          <div><dt>{usingExamples ? "Step total (synthetic)" : "Step total"}</dt><dd>{stepLabel}</dd></div>
          <div><dt>Figures on the walk</dt><dd>{activity.pedestrianCount}</dd></div>
        </dl>
        <p className="card-note">Figures follow a fixed route. The preview shows one figure per {STEPS_PER_FIGURE} steps, rounded up, with up to {HARBOR_FIGURE_LIMIT} figures.</p>
      </aside>}
      {selected === "traffic" && <aside className="record-card" aria-labelledby="traffic-title">
        <div className="card-heading"><h2 id="traffic-title">Harbor traffic</h2>
          <button aria-label="Close traffic details" onClick={() => setSelected(null)}>×</button></div>
        <dl>
          <div><dt>Replay interval</dt><dd>{day.replayLabel(traffic.startSeconds)}–{day.replayLabel(traffic.endSeconds)}</dd></div>
          <div><dt>{usingExamples ? "Total energy burned (synthetic)" : "Total energy burned"}</dt><dd>{traffic.totalKcal === null ? energyLabel : traffic.totalKcal.toFixed(2) + " kcal"}</dd></div>
          <div><dt>Mean rate</dt><dd>{traffic.meanKcalPerMinute === null ? "Unavailable" : energyLabel}</dd></div>
          <div><dt>Vehicles on the road</dt><dd>{traffic.vehicleCount}</dd></div>
        </dl>
        <p className="card-note">Total energy includes basal metabolism. The preview shows one vehicle per {KCAL_PER_MINUTE_PER_VEHICLE} kcal/min, rounded up, with up to {HARBOR_VEHICLE_LIMIT} vehicles.</p>
      </aside>}
      {typeof selected==="number" && <aside className="record-card" aria-labelledby="plot-title">
        <div className="card-heading"><h2 id="plot-title">HRV plot</h2>
          <button aria-label="Close plot details" onClick={()=>setSelected(null)}>×</button></div>
        <p>A tower stands here when daily HRV is at least {thresholdMs(selected)} ms.</p>
        <p>{hrv.status==="available" ? "Today: "+hrv.rmssdMs.toFixed(2)+" ms · "+hrv.buildingCount+" "+(hrv.buildingCount===1?"tower":"towers") : "No HRV data"}</p>
      </aside>}
      {(selected === "skyline" || selectedTower) && <aside className="record-card" aria-labelledby="skyline-title">
        <div className="card-heading"><h2 id="skyline-title">{selectedTower?.name ?? "HRV skyline"}</h2>
          <button aria-label="Close skyline details" onClick={() => setSelected(null)}>×</button></div>
        <p>{selectedTower?.description ?? "Daily heart-rate variability (RMSSD) determines the number of high-rises."}</p>
        <dl>
          {selectedTower && <div><dt>Architecture</dt><dd>{selectedTower.style}</dd></div>}
          <div><dt>{usingExamples ? "Daily HRV (synthetic)" : "Daily HRV (Google Health)"}</dt><dd>{hrv.status === "available" ? hrv.rmssdMs.toFixed(2) + " ms" : hrvStatus}</dd></div>
          <div><dt>Source date</dt><dd>{day.date}</dd></div>
          <div><dt>Building count</dt><dd>{hrv.status === "available" ? hrv.buildingCount : "Unavailable"}</dd></div>
          <div><dt>Mapping</dt><dd>One building per 5 ms, rounded down</dd></div>
        </dl>
        {hrv.status === "available" && district.overflow &&
          <p>Showing {district.visibleCount} of {hrv.buildingCount} buildings. The district has reached its display limit.</p>}
        <p className="card-note">Daily HRV determines the count. Each plot has a fixed design.</p>
      </aside>}

      {graphicsLost && <div className="graphics-alert" role="alert">Graphics stopped. Playback is paused. Reload this page to restore the scene.</div>}
      <div className="scene-footer"><span>Drag to orbit · Right-drag to pan · Scroll to zoom</span>
        {reviewViews&&<button ref={inspectButton} className="text-button" onClick={inspectFocus}>{inspectLabel}</button>}</div>
    </section>

    <section className="replay-panel" aria-label="Day replay">
      <div className="replay-heading">
        <div className="replay-date">
          <label className="sr-only" htmlFor="replay-date">Replay date</label>
          {usingExamples ? <select id="replay-date" className="date-picker" value={day.date} onChange={event => selectDate(event.target.value)}>
            {SYNTHETIC_DAYS.map(item => <option key={item.date} value={item.date}>{item.dateLabel}</option>)}
          </select> : <div className="recorded-date-controls">
            <input id="replay-date" type="date" className="date-picker" min="0001-01-01" max={lastEndedReplayDate()}
              value={day.date} onChange={event => selectDate(event.target.value)} />
            <button disabled={loadState.status === "loading"} onClick={() => {
              replay.pause();
              void dayRequest.load();
            }}>Load day</button>
          </div>}
          <span className="zone-label">{day.zone}</span>
          {!usingExamples && <span className="zone-label" role="status">{failedStreams?.length ? "Could not read " + failedStreams.join(", ") + "." : loadMessage}</span>}
        </div>
        <div className="replay-metrics">
          <div><span>Steps · 5 min</span><strong aria-label="Current five-minute steps">{stepLabel}</strong></div>
          <div><span>Energy rate · 5 min</span><strong aria-label="Current five-minute energy rate">{energyLabel}</strong></div>
        </div>
        <div className="clock"><output aria-label="Replay time">{timeLabel}</output><span>{clock.playing ? "Playing" : "Paused"}</span></div>
      </div>
      {sleepVoyages.length > 1 && <label className="speed-control">Sleep session <select
        value={selectedSleepId && sleepVoyages.some(item=>item.session.id===selectedSleepId) ? selectedSleepId : ""}
        onChange={event=>selectSleep(event.target.value)}>
        <option value="">Follow replay</option>
        {sleepVoyages.map(entry=><option value={entry.session.id} key={entry.session.id}>
          {sleepFormatter(entry,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"})(0)}
        </option>)}
      </select></label>}
      <label className="sr-only" htmlFor="replay-time">Replay time</label>
      <input id="replay-time" type="range" min="0" max={replay.durationSeconds} step="1"
        value={Math.floor(clock.seconds)} aria-valuetext={timeLabel} onChange={event => replay.seek(Number(event.target.value))} />
      <div className="timeline-labels" aria-hidden="true"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
      <div className="playback-controls">
        <button className="play-button" disabled={!sceneReady || graphicsLost || clock.seconds >= replay.durationSeconds}
          onClick={() => clock.playing ? replay.pause() : replay.play()}>{clock.playing ? "Pause" : "Play"}</button>
        <button onClick={() => replay.seek(0)}>Start of day</button>
        <button onClick={() => replay.seek(replay.durationSeconds)}>Completed day</button>
        <label className="speed-control">Speed <select value={clock.speed} onChange={event => replay.setSpeed(Number(event.target.value))}>
          <option value="1">1×</option><option value="60">60×</option><option value="240">240×</option><option value="480">480×</option>
        </select></label>
      </div>
    </section>
    <footer className="review-note">Day and Night are lighting previews, independent of replay time.</footer>
  </main>;
}
