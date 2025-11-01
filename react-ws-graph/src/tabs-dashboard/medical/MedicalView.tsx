// src/tabs-dashboard/medical/Medical.tsx
import React, { useEffect, useRef, useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { useBLEStore } from "@/store/useBLEStore";
import MedTopBar  from "./MedTopBar";

import FastLineCanvas from "./FastLineCanvas";
import BigInfos from "./BigInfos";
import { connectWebSocket, disconnectWebSocket, startTimer, stopTimer  } from "./MedWebSocket";
import { useDataStore } from "./useMedicalStore";
// import { useLiveSeries } from "./useLiveSeries";
import {WS_BASE, WSKey } from "./MedComm";
import { useMedicalStore } from "./useMedicalStore";


// Parse only: { id: "Characteristic <name>.<idx>", time, value }
type ParsedNameFrame = { t: number; value: number; baseName: string; chanIdx: number };

function parseNamedFrame(raw: string): ParsedNameFrame | null {
  try {
    const msg = JSON.parse(raw);
    const value = Number(msg?.value);
    if (!Number.isFinite(value)) return null;

    let t = Date.now();
    if (typeof msg?.time === "number") t = msg.time;
    else if (typeof msg?.time === "string") t = Number(msg.time);
    if (!Number.isFinite(t)) return null;

    if (typeof msg?.id !== "string") return null;
    const idStr = msg.id.trim();

    // Accept:
    //  "Characteristic <name>.<idx>"
    //  "Characteristic <name> [<idx>]"
    //  "<name>.<idx>"
    //  "<name> [<idx>]"
    let m =
      /^Characteristic\s+(.+?)(?:[.\[]\s*(\d+)\s*\]?)?$/.exec(idStr) ||
      /^(.+?)(?:[.\[]\s*(\d+)\s*\]?)?$/.exec(idStr);
    if (!m) return null;

    const baseName = (m[1] ?? "").trim();
    const chanIdx = m[2] ? Number(m[2]) : 1;
    if (!baseName || !Number.isFinite(chanIdx) || chanIdx < 1) return null;

    return { t, value, baseName, chanIdx };
  } catch {
    return null;
  }
}

const macHex = (s: string | undefined) =>
  (s ?? "").replace(/[^a-fA-F0-9]/g, "").toLowerCase();

const normalizeName = (s: string) =>
  s.replace(/^Characteristic\s+/i, "").trim().replace(/\s+/g, " ").toLowerCase();

const baseFromLabel = (lbl: string) => {
  // "Custom [0]" -> "Custom"
  const m = /^(.+?)\s*\[\d+\]\s*$/.exec(lbl.trim());
  return normalizeName(m ? m[1] : lbl);
};

const buildURL = (mac: string) =>
  `${WS_BASE}/ws/ble/graph/mac=${encodeURIComponent(mac)}`;

const idxFromLine = (ln: { byteIndex: string | number; label: string }): number | null => {
  const n = Number(ln.byteIndex);
  if (Number.isFinite(n)) return n;                 // explicit numeric mapping wins
  const m = /\[(\d+)\]\s*$/.exec(String(ln.label)); // label suffix "[n]"
  return m ? Number(m[1]) : null;
};

export const Medical: React.FC = () => {
  const {
    configs,
    data,
    pushMany,
    axis,
    display,
    numGraphs,
  } = useGraphStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const {  blePhase, graphPhase,lastWsMsg} = useMedicalStore();
  // const { times, values, head, len, cap } = useLiveSeries();

 const channels = useDataStore((s) => s.channels);

  const sampleInterval = 80;
  const numSeries = 3; 

  
  const dataSimulateRef = useRef<Float32Array[]>([]);
  const headRef = useRef<number[]>([]);
  const lenRef = useRef<number[]>([]);
  useEffect(() => {
    startTimer(sampleInterval);
    return () => stopTimer();
  }, []);// run one time only


  // To create simulated value for graphValues
  const valueSimulate = () => {
    let valueNumber: number = 0;
    valueNumber = Math.floor(Math.random() * (120 - 60 + 1)) + 60;
    return valueNumber;
  }
  const [simulatedValue, setSimulatedValue] = useState<string[]>(["0","0","0"]);
  // Continues update of simulated value for graphValues
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedValue([String(valueSimulate()),String(valueSimulate()),String(valueSimulate())]);
    }, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);  

  // Make simulated data for graphs
  const capRef = useRef(containerRef.current ? Math.ceil((containerRef.current.clientWidth ?? 800) / 2) : 4096);
 

  // extValuesList should be an array of Float32Array, we want to simulate it here
  const extValuesList: number[][] = [
    new Array(capRef.current).fill(0),
    new Array(capRef.current).fill(0),
    new Array(capRef.current).fill(0),
  ];  


  // const [dataSim, setData] = useState<Float32Array>(new Float32Array(capRef.current));
   const [timeSim, setTimeData] = useState<Float64Array>(new Float64Array(capRef.current));
  

  useEffect(() => {
      const id = requestAnimationFrame(() => {
      const allBuffers = channels.map(ch => ch.buffer);

      //console.log("lenRef2.current : ",lenRef2.current );
      for (let s = 0; s < allBuffers.length; s++) {
        dataSimulateRef.current[s] = new Float32Array(allBuffers[s]);
        lenRef.current[s] = channels.map((ch => ch.buffer.length))[s];
        headRef.current[s] =  channels.map((ch => ch.head))[s]-1
      }
    });
    return () => cancelAnimationFrame(id);
  }, [channels]);


  const times = useRef<number[]>(new Array(capRef.current).fill(0)).current;
  // --- Axis helpers ---
  const yDomain: [number | "auto", number | "auto"] = axis.fixed
    ? [axis.min, axis.max]
    : ["auto", "auto"];
  return (
    <div className="space-y-1">
      <MedTopBar />
      <div
       ref={containerRef}
       className={`rounded-t-md p-0 flex flex-wrap`}
       style={{ width: "100%", height: "540px" }}
      >
      <div
        className=" rounded-tl-md p-0 border border-b-0 border-r-0"
        style={{width:"70%",height:"400px"}}  
      >
        <FastLineCanvas  
                        valuesList={[dataSimulateRef.current[0]]}
                        currentHead={headRef.current[0]}
                        xAxisDataPoints={lenRef.current[0]}
                        numSeries={1}
                        cap={4096}
                        lineColors={["#afa22bff"]}
                        graphTitle="ECG"
        />
        
        <FastLineCanvas 
                        valuesList={[dataSimulateRef.current[1]]}
                        currentHead={headRef.current[1]}
                        xAxisDataPoints={lenRef.current[1]}
                        numSeries={1}
                        cap={4096}
                        lineColors={["#2faf2bff"]}
                        graphTitle="Pulse"
        />
        <FastLineCanvas 
                        valuesList={[dataSimulateRef.current[2]]}
                        currentHead={headRef.current[2]}
                        xAxisDataPoints={lenRef.current[2]}
                        numSeries={1}
                        cap={4096}
                        lineColors={["#ca4821ff"]}
                        graphTitle="Resp"
        />
      </div> 
       <div
        className="rounded-tr-md border border-b-0"
        style={{width:"30%",height:"400px"}}  
      >
        <BigInfos
                        Colors={["#c9c621ff"]}
                        Title1="AVG"
                        Unit1="mV"
                        Value1={simulatedValue[0]}
                        Title2="MAX"
                        Unit2="mV"
                        Value2={(parseInt(simulatedValue[0])+42).toString()}
                        Title3="MIN"
                        Unit3="mV"
                        Value3={(parseInt(simulatedValue[0])+66).toString()}
        />
        
        <BigInfos
                        Colors={["#21c997ff"]}
                        Title1="AVG"
                        Unit1="bpm"
                        Value1={simulatedValue[1]}
                        Title2="MAX"
                        Unit2="bpm"
                        Value2={(parseInt(simulatedValue[1])+3).toString()}
                        Title3="MIN"
                        Unit3="bpm"
                        Value3={(parseInt(simulatedValue[1])+183).toString()}
        />

        <BigInfos
                        Colors={["#7a74ceff"]}
                        Title1="AVG"
                        Unit1="bpm"
                        Value1={simulatedValue[2]}
                        Title2="MAX"
                        Unit2="bpm"
                        Value2={(parseInt(simulatedValue[2])+9).toString()}
                        Title3="MIN"
                        Unit3="bpm"
                        Value3={(parseInt(simulatedValue[2])+52).toString()}
        />

      </div>

       <div
       // we want to it start again from next line 
       className="rounded-b-md border"
       style={{width:"100%",height:"140px"}}
      > 


      <div className="p-1 grid grid-cols-3 gap-1 h-full"
        style={{height:"40px"}}
      >

            {channels.map((ch) => (
              <div
                key={ch.name}
                style={{height:"130px"}}
                className="border p-1 rounded-md"
              >
                <h2 className="font-bold mb-2">{ch.name}</h2>
                <p>Head: {ch.head}</p>
                <p className="text-sm">
                  First 5 values:{" "}
                  {[...ch.buffer.slice(0, 5)].map((v) => v.toFixed(3)).join(", ")}
                </p>
                <p className="text-sm">
                  Length:{" "}
                  {ch.buffer.length}
                </p>
              </div>
            ))}
          </div>

      </div>


      </div>
    </div>
  );
};

export default Medical;