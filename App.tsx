import { Dimensions, LogBox, Platform, StyleSheet, Text } from "react-native";
import Canvas from "react-native-canvas";
import { Camera } from "expo-camera";
import * as tf from "@tensorflow/tfjs";
import { cameraWithTensors } from "@tensorflow/tfjs-react-native";
import React, { useEffect, useRef, useState } from "react";
import * as handpose from "@tensorflow-models/handpose";
import { requestCameraPermissions } from "./src/utils/CameraUtils";
import { HAND_CONNECTIONS } from "./src/config/TfHandPoints";
import { FPS, RESIZE_HEIGHT, RESIZE_WIDTH } from "./src/config/Constants";
import { loadModel } from "./src/utils/TensorFlowLoader";
import LoadingModel from "./src/component/LoadingModel";

const TensorCamera = cameraWithTensors(Camera);

LogBox.ignoreAllLogs(true);

const { width, height } = Dimensions.get("window");

export default function App() {
  const [model, setModel] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  let context = useRef<CanvasRenderingContext2D>();
  let canvas = useRef<Canvas>();

  useEffect(() => {
    // Separating camera permission request
    (async () => {
      await requestCameraPermissions(setPermissionsGranted);
    })();
  }, []);

  useEffect(() => {
    // Separating model loading
    if (permissionsGranted) {
      (async () => {
        await loadModel(setModel, setIsModelReady);
      })();
    }
  }, [permissionsGranted]);

  function handleCameraStream(images: any) {
    const loop = async () => {
      const nextImageTensor = images.next().value;

      if (!model || !nextImageTensor) throw new Error("no model");

      model
        .estimateHands(nextImageTensor)
        .then((predictions) => {
          mapPoints(predictions, nextImageTensor);
          tf.dispose(nextImageTensor);
        })
        .catch((err) => {
          console.log(err);
        });

      setTimeout(loop, 1000 / FPS);
    };
    loop();
  }

  function drawKeypoints(keypoints: any[][], ctx: CanvasRenderingContext2D) {
    keypoints.forEach((keypoint: any[]) => {
      ctx.beginPath();
      ctx.arc(keypoint[0], keypoint[1], 5, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });
  }

  function drawConnections(
    pairs: number[][][] | [any, any][],
    ctx: CanvasRenderingContext2D
  ) {
    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    pairs.forEach(([start, end]) => {
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(end[0], end[1]);
    });
    ctx.stroke();
  }

  function mapPoints(
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

    const flipHorizontal = true;

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

  return isModelReady ? (
    <>
      <TensorCamera
        style={styles.camera}
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
  ) : (
      <LoadingModel />
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
    width: width, // Use the numeric value directly
    height: height, // Use the numeric value directly
  },
});
