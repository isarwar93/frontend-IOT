import React, { useCallback, useEffect, useRef, useState } from "react";
import MedTopBar  from "./MedTopBar";
import FastLineCanvas from "./FastLineCanvas";
import BigInfos from "./BigInfos";
import { startTimer, stopTimer  } from "./MedWebSocket";
import { useDataStore } from "./useMedicalStore";



export const Medical: React.FC = () => {

  // const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const channels = useDataStore((s) => s.channels);

  const sampleInterval = 10;
  
  const dataSimulateRef = useRef<Float32Array[]>([]);
  const headRef = useRef<number[]>([]);
  const lenRef = useRef<number[]>([]);
  useEffect(() => {
    startTimer(sampleInterval);
    return () => stopTimer();
  }, []);// run one time only


  const [isTabVisible, setIsTabVisible] = useState(true);

  const handleVisibilityChange = useCallback(() => {
    setIsTabVisible(document.visibilityState === 'visible');
  }, []);

  useEffect(() => {
    //stop the timer when tab is not active
    if (!isTabVisible) {
      stopTimer();
    } else {
      startTimer(sampleInterval);
    }
    },
    [isTabVisible]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const allBuffers = channels.map(ch => ch.buffer);
    for (let s = 0; s < allBuffers.length; s++) {
      dataSimulateRef.current[s] = allBuffers[s];
      lenRef.current[s] = channels.map((ch => ch.buffer.length))[s];
      headRef.current[s] =  channels.map((ch => ch.head))[s]-1
    }
  }, [channels]);



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


  //Blood pressure values arriving simulation
  const [lines, setLines] = useState<string[]>([]);
  const containerRef2 = useRef<HTMLDivElement>(null);
  
  // Simulate incoming messages every 500ms
  useEffect(() => {
      setLines(prev => {
        const date = new Date();
        const showTime = date.getHours() 
        + ':' + date.getMinutes() 
        + ":" + date.getSeconds();
        // we want to show complete data from websocket data
        const dataSimulateRefCurrent = dataSimulateRef.current[0];
        // we want to print whole buffer data as string
        // const dataString = Array.from(dataSimulateRefCurrent).map(num => num.toFixed(2)).join(", ");
        const newLines = [...prev, ` ${showTime} -> Message ${simulatedValue[0]}`  ];
        // keep only last 20 lines
        return newLines.slice(-20);
      });

  }, [simulatedValue]);

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
                        //Value1={headRef.current[0].toString()}
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
        <div
          style={{height:"130px"}}
          className="border p-1 rounded-md"
        >
          <h2 className="font-bold mb-2">Information</h2>
          <div className="w-full h-20 text-green-400 font-mono text-sm overflow-y-auto rounded-lg p-0" 
          >
            <p>
              Name: Ismail <br></br>
              Age: 33<br></br>
              Height: 173 cm<br></br>
              Weight: 70.5 kg<br></br>
            </p>
          </div>
        </div>


        <div
          style={{height:"130px"}}
          className="border p-1 rounded-md"
        >
          <h2 className="font-bold mb-2">Blood Pressure</h2>
          <div className="w-full h-20 text-green-400 font-mono text-sm overflow-y-auto rounded-lg p-0" 
          ref={containerRef2}
          // style={{height:"40px"}}
          >
            {lines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>



<div
          style={{height:"130px"}}
          className="border p-1 rounded-md"
        >
          <h2 className="font-bold mb-2">Body Temp</h2>
          <div className="w-full h-20 text-green-400 font-mono text-sm overflow-y-auto rounded-lg p-0" 
          ref={containerRef2}
          // style={{height:"40px"}}
          >
            {lines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>


      </div>
      </div>
      </div>
     </div>
  );
};

export default Medical;