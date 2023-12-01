import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';
import { MODEL_CONFIG } from '../config/ModelConfig';

type LoadModelType = (
  setModel: (model: handpose.HandPose) => void,
  setIsModelReady: (isModelReady: boolean) => void
) => Promise<void>;

export const loadModel: LoadModelType = async (setModel, setIsModelReady) => {
  await tf.ready();
  const loadedModel = await handpose.load(MODEL_CONFIG);
  setModel(loadedModel);
  setIsModelReady(true);
};
