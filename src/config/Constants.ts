import { Dimensions } from "react-native";

// start
const { width, height } = Dimensions.get('window');

export const RESIZE_WIDTH = 224;

export const RESIZE_HEIGHT = Math.round((height / width) * RESIZE_WIDTH);

export const FPS = 15; // set desired FPS for predictions
