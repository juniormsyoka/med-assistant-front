import * as tf from '@tensorflow/tfjs';
import { loadModel } from '../models/loadModel';

interface InputData {
    age: string;
    gender: string;
    symptom1: string;
    symptom2: string;
    symptom3: string;
    heartRate: string;
    temperature: string;
    bloodPressure: string;
    oxygenSaturation: string;
}

interface DiagnosisResult {
    diagnosis: string;
    severity: string;
    treatment: string;
    confidence?: number;
}

export async function predictDiagnosis(data: InputData): Promise<DiagnosisResult> {
    const model = await loadModel();

    // TODO: map your input data to the model’s expected format
    const inputTensor = tf.tensor2d([[
        parseFloat(data.age),
        data.gender === "male" ? 1 : 0,
        parseFloat(data.heartRate || "0"),
        parseFloat(data.temperature || "0"),
        parseFloat(data.oxygenSaturation || "0"),
        parseFloat(data.bloodPressure.split('/')[0] || "0"), // systolic
        parseFloat(data.bloodPressure.split('/')[1] || "0"), // diastolic
        // Encode symptoms
        data.symptom1 ? 1 : 0,
        data.symptom2 ? 1 : 0,
        data.symptom3 ? 1 : 0,
    ]]);

    const prediction = model.predict(inputTensor) as tf.Tensor;
    const predictionData = prediction.dataSync();

    // You’ll need a mapping between output index → diagnosis
    const diagnoses = ["Condition A", "Condition B", "Condition C", "Condition D", "Condition E"];
    const severityLevels = ["Low", "Medium", "High"];

    const predictedIndex = predictionData.indexOf(Math.max(...predictionData));
    const confidence = predictionData[predictedIndex];

    return {
        diagnosis: diagnoses[predictedIndex] || "Unknown",
        severity: severityLevels[Math.floor(predictedIndex / severityLevels.length)] || "Unknown",
        treatment: "Refer to physician",
        confidence,
    };
}
