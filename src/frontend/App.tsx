import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createReplay } from "../core/replay.ts";
import {
  HARBOR_FIGURE_LIMIT, HARBOR_VEHICLE_LIMIT, KCAL_PER_MINUTE_PER_VEHICLE,
  STEPS_PER_FIGURE, lastEndedReplayDate, recordedReplayDay, stepsAt, SYNTHETIC_DAYS, trafficAt,
} from "../core/representative-day.ts";
import { arrivalDate,asleepMinutes,dayOffset,departure,departureDate,voyage,wake } from "../scene/sleep-voyage.ts";
import { deriveHrvSkyline } from "../core/skyline.ts";
import { isTowerView, skylineDisplay, TOWER_DESIGNS } from "../scene/skyline-layout.ts";
import type { CameraCommand, SceneView, TowerDesignId } from "../scene/skyline-layout.ts";
import type { HrvSource } from "../core/daily-hrv.ts";
import type { ReplayDay } from "../core/representative-day.ts";
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
    return { day, replay: createReplay(day.durationSeconds), source: "synthetic" as HrvSource };
  });
  const clock = useSyncExternalStore(replay.subscribe, replay.read);
  const timeLabel = selectedDay.replayLabel(clock.seconds);
  const dayRequest = useDayReplay(source, selectedDay);
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
  const offset=dayOffset(day.date,usingExamples);
  const journey=voyage(offset,clock.seconds);
  const loadMessage = {
    idle: "Choose a date and load the day.",
    loading: "Loading day…",
    "sign-in": "Sign in to load this day.",
    renew: "Renew Google authorization to load this day.",
    error: "Could not load this day.",
    ready: "Day loaded.",
  }[loadState.status];
  const failedStreams = recorded && [
    recorded.heartRate.status === "failed" && "heart rate", recorded.hrv.status === "failed" && "HRV", recorded.steps.status === "failed" && "steps",
    recorded.calories.status === "failed" && "total energy",
  ].filter(Boolean);
  const hrvStatus = loadState.status !== "ready" ? loadMessage
    : recorded?.hrv.status === "failed" ? "HRV read failed" : "No HRV data";
  const activity = stepsAt(day, clock.seconds);
  const stepLabel = recorded?.steps.status === "failed" ? "Step read failed"
    : activity.steps === null ? "No step data" : activity.steps + " steps";
  const traffic = trafficAt(day, clock.seconds);
  const energyLabel = recorded?.calories.status === "failed" ? "Energy read failed"
    : traffic.meanKcalPerMinute === null ? "No calorie data" : traffic.meanKcalPerMinute.toFixed(2) + " kcal/min";
  const [night, setNight] = useState(false);
  const [selected, setSelected] = useState<"wake" | "sleep" | "heart" | "boat" | "berth" | "skyline" | "steps" | "traffic" | TowerDesignId | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({ view: "skyline", revision: 0, districtRows: 1 });
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
  const [heartSpan,setHeartSpan]=useState([0,1] as [number,number]);
  const selectHeart=(a:number,b:number)=>{replay.pause();setHeartSpan([a,b]);setSelected("heart")};
  const heartReady=usingExamples||recorded?.heartRate.status==="ready";
  const heartStatus=heartReady?(recorded?.cachedHeartRate?"Cached Google Health":usingExamples?"Synthetic data":"Google Health"):loadState.status==="ready"?"Heart-rate read failed":loadMessage;
  const ridgeView=cameraCommand.view==="ridge";
  const sleepView=cameraCommand.view==="sleep";
  const showDeparture=()=>{
    const first=SYNTHETIC_DAYS.find(item=>item.date===departureDate)!;
    const next=createReplay(first.durationSeconds);
    next.setSpeed(replay.read().speed);next.seek(departure);replay.pause();
    setReplayDay({day:first,replay:next,source:"synthetic"});setSelected(null);
    setCameraCommand(previous=>({...previous,view:"sleep",revision:previous.revision+1}));
  };
  useEffect(()=>{
    if(!sleepView || !usingExamples || day.date!==departureDate)return;
    let playing=replay.read().playing;
    return replay.subscribe(()=>{
      const current=replay.read();
      if(playing && !current.playing && current.seconds===replay.durationSeconds){
        const nextDay=SYNTHETIC_DAYS.find(item=>item.date===arrivalDate)!;
        const next=createReplay(nextDay.durationSeconds);next.setSpeed(current.speed);next.play();
        setReplayDay({day:nextDay,replay:next,source:"synthetic"});setSelected(null);
      }
      playing=current.playing;
    });
  },[sleepView,usingExamples,day.date,replay]);
  const selectBoat = () => { replay.pause(); setSelected("boat"); };
  const selectBerth = () => { replay.pause(); setSelected("berth"); };
  const selectTower = (design: TowerDesignId) => { replay.pause(); setSelected(design); };
  const selectSkyline = () => { replay.pause(); setSelected("skyline"); };
  const selectSteps = () => { replay.pause(); setSelected("steps"); };
  const selectTraffic = () => { replay.pause(); setSelected("traffic"); };
  const switchDay = (nextDay: ReplayDay, nextSource: HrvSource) => {
    if (day.date === nextDay.date && source === nextSource) return;
    const nextReplay = createReplay(nextDay.durationSeconds);
    nextReplay.setSpeed(replay.read().speed);
    replay.pause();
    setReplayDay({ day: nextDay, replay: nextReplay, source: nextSource });
    setSelected(null);
  };
  const selectDate = (date: string) => {
    if (usingExamples) {
      const nextDay = SYNTHETIC_DAYS.find(item => item.date === date);
      if (nextDay) switchDay(nextDay, source);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= "0001-01-01" && date <= lastEndedReplayDate()) {
      switchDay(recordedReplayDay(date), source);
    }
  };
  const setView = (view: SceneView) => {
    setCameraCommand(previous => ({ view, revision: previous.revision + 1, districtRows: district.rows }));
    if (isTowerView(view)) setSelected(null);
  };
  const focusedTower = TOWER_DESIGNS.find(design => design.id === cameraCommand.view);
  const selectedTower = TOWER_DESIGNS.find(design => design.id === selected);
  const walkView = cameraCommand.view === "walk";
  const roadView = cameraCommand.view === "road";
  const inspectWalk = walkView || cameraCommand.view === "square" || cameraCommand.view === "side";
  const skylineView = !!focusedTower || cameraCommand.view === "skyline" || cameraCommand.view === "world";
  const inspectFocus = () => {
    if(sleepView){replay.pause();setSelected("sleep");}
    else if (ridgeView) { const i=Math.min(day.heartMeans.length-1,Math.floor(clock.seconds/300));selectHeart(i,i+1); }
    else if (focusedTower) selectTower(focusedTower.id);
    else if (skylineView) selectSkyline();
    else if (inspectWalk) selectSteps();
    else if (roadView) selectTraffic();
    else if (cameraCommand.view === "berth") selectBerth();
    else selectBoat();
  };
  const inspectLabel = sleepView?"Inspect sleep voyage":ridgeView?"Inspect heart rate":focusedTower ? "Inspect tower" : skylineView ? "Inspect skyline" : inspectWalk ? "Inspect steps"
    : roadView ? "Inspect traffic" : cameraCommand.view === "berth" ? "Inspect berth" : "Inspect boat";
  const sceneTitle = sleepView?"Sleep island":ridgeView?"Heart-rate mountains":focusedTower ? focusedTower.name : skylineView ? "HRV skyline"
    : walkView ? "Harbor walk" : roadView ? "Harbor road" : cameraCommand.view === "square" ? "Market square" : cameraCommand.view === "side" ? "Return lane" : cameraCommand.view === "berth" ? "Cargo berth" : "Working harbor";

  useEffect(() => {
    const visibility = () => { if (document.hidden) replay.pause(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); replay.pause(); };
  }, [replay]);

  return <main className={night ? "app night" : "app"}>
    <header className="app-header">
      <a className="brand" href="/" aria-label="HealthCity home"><span className="brand-mark" aria-hidden="true">≈</span>HealthCity</a>
      {dayRequest.googleHealthEnabled || !usingExamples ? <label className="data-label">
        <span className="sr-only">Replay source</span>
        <select value={source} onChange={event => {
          const nextSource = event.target.value as HrvSource;
          if(sleepView && nextSource!=="synthetic") setView("world");
          switchDay(nextSource === "synthetic" ? SYNTHETIC_DAYS[0] : recordedReplayDay(lastEndedReplayDate()), nextSource);
        }}>
          <option value="synthetic">Synthetic data</option>
          <option value="google-health">Google Health</option>
        </select>
      </label> : <span className="data-label"><span aria-hidden="true" />Synthetic data</span>}
      <a className="account-link" href="/auth/status">Account</a>
    </header>

    <section className="world" aria-label="Interactive HealthCity scene">
      <div className={inspectWalk || roadView ? "scene-heading harbor-activity-heading" : "scene-heading"}>
        <h1>{sceneTitle}</h1>
        {sleepView && <p>{offset===null?"Demo voyage · Nov 11–12":journey.stage+" · Synthetic sleep"}</p>}
        {sleepView && offset===null && usingExamples && <button onClick={showDeparture}>View Nov 11 departure</button>}
        {ridgeView && <p>{heartReady && day.heartMeans.every(v=>v===null)?"No heart-rate data":heartStatus}</p>}
        {focusedTower && <p>{focusedTower.style + " · Design preview"}</p>}
        {skylineView && <p className="skyline-summary">{hrv.status === "available"
          ? (usingExamples ? "Synthetic daily HRV " : "Daily HRV ") + hrv.rmssdMs.toFixed(2) + " ms · " + hrv.buildingCount + " buildings"
          : hrvStatus}</p>}
        {skylineView && district.overflow && <p className="skyline-summary">Showing {district.visibleCount} buildings in this district.</p>}
      </div>
      <div className="scene-canvas" data-testid="scene-canvas">
        <SceneBoundary onFailure={onGraphicsLost}>
          <Suspense fallback={<div className="scene-message" role="status">Loading the harbor…</div>}>
            <BoatScene offset={offset} onWake={()=>{replay.pause();setSelected("wake")}} onHeart={selectHeart} heartReady={!!heartReady} replay={replay} day={day} night={night} cameraCommand={cameraCommand} hrv={hrv}
              onSelect={selectBoat} onSelectBerth={selectBerth} onGraphicsLost={onGraphicsLost}
              onBoatReady={onBoatReady} onBerthReady={onBerthReady}
              onSkylineReady={onSkylineReady} onWalkReady={onWalkReady}
              onRoadReady={onRoadReady} onSelectTower={selectTower} />
          </Suspense>
        </SceneBoundary>
      </div>
      {!sceneReady && !graphicsLost && <p className="asset-status" role="status">Loading harbor…</p>}

      <div className="view-controls" aria-label="View controls">
        <button onClick={() => setView("world")}>World view</button>
        <label className="view-picker"><span className="sr-only">Scene view</span>
          <select aria-label="Scene view" value={cameraCommand.view} onChange={event => setView(event.target.value as SceneView)}>
            {usingExamples && <option value="sleep">Sleep island</option>}
            <option value="ridge">Heart-rate mountains</option>
            <option value="world">World overview</option>
            <option value="skyline">Skyline overview</option>
            <optgroup label="Tower designs">
              {TOWER_DESIGNS.map(design => <option key={design.id} value={design.id}>{design.name}</option>)}
            </optgroup>
            <optgroup label="Harbor">
              <option value="harbor">Harbor view</option>
              <option value="walk">Harbor walk</option>
              <option value="road">Harbor road</option>
              <option value="square">Market square</option>
              <option value="side">Return lane</option>
              <option value="detail">Boat detail</option>
              <option value="berth">Cargo berth</option>
            </optgroup>
          </select>
        </label>
        <fieldset className="lighting-controls"><legend className="sr-only">Review lighting</legend>
          <button aria-pressed={!night} onClick={() => setNight(false)}>Day</button>
          <button aria-pressed={night} onClick={() => setNight(true)}>Night</button>
        </fieldset>
      </div>

      {selected === "heart" && <aside className="record-card" aria-label="Heart-rate interval"><div className="card-heading"><h2>Heart rate</h2><button aria-label="Close heart rate" onClick={()=>setSelected(null)}>×</button></div>
        <p>{day.intervalLabel(heartSpan[0]*300)} – {day.intervalLabel(heartSpan[1]*300)}</p>
        <p>{heartReady?(day.heartMeans[heartSpan[0]]==null?"No heart-rate data":day.heartMeans[heartSpan[0]]+" bpm · Five-minute mean"):heartStatus}</p>
        {heartReady && <p>{heartStatus}</p>}</aside>}
      {(selected==="wake" || selected==="sleep") && <aside className="record-card" aria-label="Sleep voyage"><div className="card-heading"><h2>{selected==="wake"?"Awakening buoy":"Sleep voyage"}</h2><button aria-label="Close sleep details" onClick={()=>setSelected(null)}>×</button></div>
        {selected==="wake"?<p>Nov 12 · 03:00–03:08 · {(wake.end-wake.start)/60} min awake</p>:<><p>Nov 11, 23:00 – Nov 12, 06:30 · Chicago</p><p>7 h 30 min elapsed · {asleepMinutes} min asleep</p><button onClick={showDeparture}>View departure</button></>}
        <p>Synthetic sleep session</p></aside>}
      {selected === "boat" && <aside className="record-card" aria-labelledby="boat-title">
        <div className="card-heading"><h2 id="boat-title">The harbor boat</h2><button aria-label="Close boat details" onClick={() => setSelected(null)}>×</button></div>
        <p>A working vessel for HealthCity’s sleep journeys.</p>
        <dl><div><dt>Current scene</dt><dd>{journey.stage}</dd></div>
          <div><dt>Movement</dt><dd>Synthetic boat and water motion</dd></div>
          <div><dt>Sleep records</dt><dd>{offset===null?"Not connected":"Nov 11–12 demo session"}</dd></div></dl>
        {usingExamples && <button onClick={()=>{if(offset===null)showDeparture();else{setSelected(null);setView("sleep")}}}>Follow sleep voyage</button>}
      </aside>}
      {selected === "berth" && <aside className="record-card" aria-labelledby="berth-title">
        <div className="card-heading"><h2 id="berth-title">The cargo berth</h2><button aria-label="Close berth details" onClick={() => setSelected(null)}>×</button></div>
        <p>The shore crane transfers a slung pallet between the ship and a flatbed. The forklift serves the covered storage bays.</p>
        <dl><div><dt>Equipment</dt><dd>Pedestal crane and forklift</dd></div>
          <div><dt>Road access</dt><dd>Return street service gate</dd></div>
          <div><dt>Movement</dt><dd>Scenic replay cycle</dd></div></dl>
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
        <button className="text-button" onClick={inspectFocus}>{inspectLabel}</button></div>
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
