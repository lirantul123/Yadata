import { spawn } from "child_process";
import { PredictFeatures } from "../predict/models/predictModel";

export function runPythonModel(features: PredictFeatures): Promise<number> {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", ["python/model.py"]);

    let output = "";

    py.stdout.on("data", (data) => (output += data.toString()));
    py.stderr.on("data", (data) => console.error("PYTHON ERROR:", data.toString()));

    py.on("close", () => {
      try {
        const json = JSON.parse(output);
        resolve(json.price);
      } catch (err) {
        reject(err);
      }
    });

    py.stdin.write(JSON.stringify({ features }));
    py.stdin.end();
  });
}
