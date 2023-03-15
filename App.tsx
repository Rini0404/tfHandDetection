import { Dimensions, LogBox, Platform, StyleSheet } from "react-native";
import Canvas from "react-native-canvas";
import { Camera } from "expo-camera";
import * as tf from "@tensorflow/tfjs";
import { cameraWithTensors } from "@tensorflow/tfjs-react-native";
import React, { useEffect, useRef, useState } from "react";

import * as handpose from "@tensorflow-models/handpose";

const TensorCamera = cameraWithTensors(Camera);

LogBox.ignoreAllLogs(true);

const { width, height } = Dimensions.get("window");

const MODEL_CONFIG = {
  flipHorizontal: true, // flip e.g for video
  maxNumBoxes: 20, // maximum number of boxes to detect
  iouThreshold: 0.5, // ioU threshold for non-max suppression
  scoreThreshold: 0.8, // confidence threshold for predictions.
};

const RESIZE_WIDTH = 128;
const RESIZE_HEIGHT = Math.round((height / width) * RESIZE_WIDTH);
const FPS = 5; // set desired FPS for predictions

export default function App() {
  const [model, setModel] = useState<handpose.HandPose | null>(null);
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

      if (!model || !nextImageTensor) throw new Error("no model");

      model
        .estimateHands(nextImageTensor)
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

  function drawKeypoints(keypoints, ctx) {
    keypoints.forEach((keypoint) => {
      ctx.beginPath();
      ctx.arc(keypoint[0], keypoint[1], 5, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });
  }

  function drawConnections(pairs, ctx) {
    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    pairs.forEach(([start, end]) => {
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(end[0], end[1]);
    });
    ctx.stroke();
  }

  // Hand part connections
  const HAND_CONNECTIONS = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4], // Thumb
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8], // Index
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12], // Middle
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16], // Ring
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20], // Pinky
  ];

  function drawRectangle(
    predictions: handpose.AnnotatedPrediction[],
    nextImageTensor: any
  ) {
    if (!context.current || !canvas.current) {
      console.log("no context or canvas");
      return;
    }

    // to match the size of the camera preview
    const scaleWidth = width / nextImageTensor.shape[1];
    const scaleHeight = height / nextImageTensor.shape[0];

    const flipHorizontal = Platform.OS === "ios" ? false : true;

    // We will clear the previous prediction
    context.current.clearRect(0, 0, width, height);

    // Draw the keypoints and connections for each hand prediction
    for (const prediction of predictions) {
      const keypoints = prediction.landmarks.map((landmark) => {
        const x = flipHorizontal
          ? canvas.current.width - landmark[0] * scaleWidth
          : landmark[0] * scaleWidth;
        const y = landmark[1] * scaleHeight;
        return [x, y];
      });

      drawKeypoints(keypoints, context.current);
      drawConnections(
        HAND_CONNECTIONS.map(([startIdx, endIdx]) => [
          keypoints[startIdx],
          keypoints[endIdx],
        ]),
        context.current
      );
    }
  }

  const handleCanvas = async (can: Canvas) => {
    if (can) {
      can.width = width;
      can.height = height;
      const ctx: CanvasRenderingContext2D = can.getContext("2d");
      context.current = ctx;
      ctx.strokeStyle = "red";
      ctx.fillStyle = "red";
      ctx.lineWidth = 3;
      canvas.current = can;
    }
  };

  let textureDims: { height: any; width: any };
  Platform.OS === "ios"
    ? (textureDims = { height: 1920, width: 1080 })
    : (textureDims = { height: 1200, width: 1600 });

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== "granted") {
        alert("Sorry, we need camera roll permissions to make this work!");
      }

      await tf.ready();
      const loadedModel = await handpose.load(MODEL_CONFIG);
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
        resizeHeight={RESIZE_HEIGHT}
        resizeWidth={RESIZE_WIDTH}
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
    backgroundColor: "#fff",
  },
  camera: {
    width: "100%",
    height: "100%",
  },
  canvas: {
    position: "absolute",
    zIndex: 1000000,
    width: "100%",
    height: "100%",
  },
});
