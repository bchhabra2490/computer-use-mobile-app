import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { loadPairing } from "@/storage/pairing";
import { COMPOSE_WIDGET_NAME } from "@/state/compose-intent";
import { JarvisWidget } from "@/widget/JarvisWidget";

async function render(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== COMPOSE_WIDGET_NAME) return;
  const pairing = await loadPairing();
  props.renderWidget(<JarvisWidget paired={Boolean(pairing)} />);
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      await render(props);
      break;
    default:
      break;
  }
}
