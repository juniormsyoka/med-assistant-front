import * as tf from '@tensorflow/tfjs';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

// Type for the loaded model
let model: tf.LayersModel | null = null;

export async function loadModel(): Promise<tf.LayersModel> {
  if (model) return model; // Cache model

  await tf.ready();

  // Load the model JSON and weights from assets
  const modelAsset = Asset.fromModule(require('../models/tfjs_model/model.json'));
  await modelAsset.downloadAsync();
  const modelJsonUri = modelAsset.localUri || '';

  const weightsAsset = Asset.fromModule(require('../models/tfjs_model/group1-shard1of1.bin'));
  await weightsAsset.downloadAsync();
  const weightsUri = weightsAsset.localUri || '';

  // Fetch the JSON and weights files
  const modelJson = JSON.parse(await FileSystem.readAsStringAsync(modelJsonUri));
  const weightsBuffer = await FileSystem.readAsStringAsync(weightsUri, {
  encoding: 'base64',
});


  // Load model
  model = await tf.loadLayersModel(tf.io.browserFiles([
    new File([JSON.stringify(modelJson)], 'model.json', { type: 'application/json' }),
    new File([Uint8Array.from(atob(weightsBuffer), c => c.charCodeAt(0))], 'group1-shard1of1.bin')
  ]));

  console.log('Model loaded successfully!');
  return model;
}
