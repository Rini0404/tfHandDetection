
import { Dimensions, LogBox, Platform, StyleSheet } from 'react-native';
import Canvas from 'react-native-canvas';
import { Camera } from 'expo-camera';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';


const TensorCamera = cameraWithTensors(Camera);

LogBox.ignoreAllLogs(true);

const { width, height } = Dimensions.get('window');

const MODEL_CONFIG = {
  base: 'lite_mobilenet_v2' as cocoSsd.ObjectDetectionBaseModel,
  quantBytes: 2,
};

const RESIZE_WIDTH = 128;
const RESIZE_HEIGHT = Math.round((height / width) * RESIZE_WIDTH);
const FPS = 5; // set desired FPS for predictions

export default function App() {
  const [model, setModel] = useState<cocoSsd.ObjectDetection>();
  let context = useRef<CanvasRenderingContext2D>();
  let canvas = useRef<Canvas>();
  const [isModelReady, setIsModelReady] = useState(false);

 
  function handleCameraStream(images: any) {
    const loop = async () => {
      if (!isModelReady) {
        setTimeout(loop, 1000 / FPS);
        return;
      }

      const nextImageTensor = images.next().value;

      if (!model || !nextImageTensor) throw new Error('no model');

      model
        .detect(nextImageTensor)
        .then((predictions) => {
          drawRectangle(predictions, nextImageTensor);
        })
        .catch((err) => {
          console.log(err);
        });

      setTimeout(loop, 1000 / FPS); // debounce the loop to limit FPS
    };
    loop();
  }

  function drawRectangle(predictions: cocoSsd.DetectedObject[], nextImageTensor: any) {
    if (!context.current || !canvas.current) {
      console.log('no context or canvas');
      return;
    }
  
    // to match the size of the camera preview
    const scaleWidth = width / nextImageTensor.shape[1];
    const scaleHeight = height / nextImageTensor.shape[0];
  
    const flipHorizontal = Platform.OS === 'ios' ? false : true;
  
    // We will clear the previous prediction
    context.current.clearRect(0, 0, width, height);
  
    // Draw the rectangle for each prediction
    for (const prediction of predictions) {
      const [x, y, width, height] = prediction.bbox;
  
      // Scale the coordinates based on the ratios calculated
      const boundingBoxX = flipHorizontal
        ? canvas.current.width - x * scaleWidth - width * scaleWidth
        : x * scaleWidth;
      const boundingBoxY = y * scaleHeight;
  
      // Draw the bounding box.
      context.current.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      context.current.lineWidth = 4;
      context.current.strokeRect(
        boundingBoxX,
        boundingBoxY,
        width * scaleWidth,
        height * scaleHeight
      );
  
      // Draw the label background
      context.current.fillStyle = 'rgba(255, 0, 0, 0.6)';
      context.current.fillRect(
        boundingBoxX,
        boundingBoxY - 24,
        context.current.measureText(prediction.class).width + 10,
        24
      );
  
      // Draw the label
      context.current.font = 'bold 16px Arial';
      context.current.fillStyle = 'white';
      context.current.fillText(
        prediction.class,
        boundingBoxX + 5,
        boundingBoxY - 5
      );
    }
  }
  

  const handleCanvas = async (can: Canvas) => {
    if (can) {
      can.width = width;
      can.height = height;
      const ctx: CanvasRenderingContext2D = can.getContext('2d');
      context.current = ctx;
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'red';
      ctx.lineWidth = 3;
      canvas.current = can;
    }
  };

  let textureDims: { height: any; width: any; };
  Platform.OS === 'ios'
    ? (textureDims = { height: 1920, width: 1080 })
    : (textureDims = { height: 1200, width: 1600 });

    useEffect(() => {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!'); 
        }
  
        await tf.ready();
        const loadedModel = await cocoSsd.load(MODEL_CONFIG);
        setModel(loadedModel);
        setIsModelReady(true);
      })();
    }, []);
  

  return (
    <>
      <TensorCamera
        // Standard Camera props
        style={styles.camera}
        type={Camera.Constants.Type.back}
        // Tensor related props
        cameraTextureHeight={textureDims.height}
        cameraTextureWidth={textureDims.width}
        resizeHeight={200}
        resizeWidth={152}
        resizeDepth={3}
        onReady={handleCameraStream}
        autorender={true}
        useCustomShadersToResize={false}
      />

      <Canvas style={styles.canvas} ref={handleCanvas} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  canvas: {
    position: 'absolute',
    zIndex: 1000000,
    width: '100%',
    height: '100%',
  },
});
