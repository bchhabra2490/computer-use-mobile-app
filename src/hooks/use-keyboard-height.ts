import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const windowHeight = Dimensions.get("window").height;
        const overlap = Math.max(0, windowHeight - event.endCoordinates.screenY);
        setHeight(overlap);
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setHeight(0);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
