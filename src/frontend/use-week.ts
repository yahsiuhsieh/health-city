import {useCallback,useEffect,useRef,useState} from "react";
import {summaryDates,WEEK_SUMMARY_PATH} from "../core/week-summary.ts";
import {syntheticWeek} from "../core/synthetic-week.ts";
import type {Summary} from "./metric-values.ts";

export function useWeek(date:string,zone:string,synthetic:boolean){
  const key=[date,zone,synthetic].join("/");
  const [result,setResult]=useState<{key:string;days?:Summary[];error?:boolean;updated?:boolean}>();
  const active=useRef<AbortController|null>(null);
  const load=useCallback(async(refresh=false,check=false)=>{
    active.current?.abort();const controller=new AbortController();active.current=controller;
    if(!check)setResult({key});
    try{
      let days:Summary[];
      if(synthetic)days=syntheticWeek(date).days;
      else{
        const response=await fetch(WEEK_SUMMARY_PATH,{method:"POST",body:new URLSearchParams({date,timeZone:zone,...(refresh?{refresh:"1"}:{})}),signal:controller.signal,cache:"no-store",redirect:"error"});
        if(!response.ok)throw Error();
        const data=await response.json() as {date:string;timeZone:string;days:Summary[]};
        if(data.date!==date||data.timeZone!==zone||!Array.isArray(data.days)||data.days.length!==8||
          !summaryDates(date).every((d,i)=>data.days[i]?.date===d))throw Error();
        days=data.days;
      }
      if(!controller.signal.aborted)setResult(prev=>check&&prev?.key===key&&prev.days?{...prev,updated:JSON.stringify(prev.days)!==JSON.stringify(days)}:{key,days});
    }catch{if(!controller.signal.aborted&&!check)setResult({key,error:true});}
  },[date,zone,synthetic,key]);
  useEffect(()=>{
    const id=setTimeout(()=>void load(),synthetic?0:300);
    const visibility=()=>{if(!document.hidden&&!synthetic)void load(false,true);};
    document.addEventListener("visibilitychange",visibility);
    return ()=>{clearTimeout(id);active.current?.abort();document.removeEventListener("visibilitychange",visibility);};
  },[load,synthetic]);
  return {...(result?.key===key?result:{}),load};
}
