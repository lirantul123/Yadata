import { spawn } from "child_process";
import { PythonResult } from "../predict/models/predictModel";

export async function runPythonModel(data: any): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", ["./python/model.py"]);

    let result = "";
    let error = "";

    py.stdout.on("data", (data) => {
      result += data.toString();
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.on("close", (code) => {
      if (error) {
        console.error("PYTHON ERROR:", error);
        reject(error);
      } else {
        try {
          resolve(JSON.parse(result) as PythonResult);
        } catch (err) {
          console.error("Prediction error:", err);
          reject(err);
        }
      }
    });

    py.stdin.write(JSON.stringify({ features: data }));
    py.stdin.end();
  });
}
