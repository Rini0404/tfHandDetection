import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

const LoadingModel = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 18,
          paddingBottom: 10,
        }}
      >
        Initializing Model and camera...
      </Text>
      <ActivityIndicator size="large" color="rgb(3, 209, 0)" />
    </View>
  );
};

export default LoadingModel;
