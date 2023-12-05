<script lang="ts">
  import extComm from "@/messaging";
  import { getNotificationsContext } from "svelte-notifications";
  const { addNotification } = getNotificationsContext();

  extComm.on("notification", (data) => {
    addNotification({
      text: data.message,
      position: "top-right",
      type: "info",
      removeAfter: 2000,
    });
  });

  extComm.on("notificationError", (data) => {
    addNotification({
      text: data.message,
      position: "top-right",
      type: "error",
      removeAfter: 2000,
    });
  });

  extComm.on("notificationWarning", (data) => {
    addNotification({
      text: data.message,
      position: "top-right",
      type: "warning",
      removeAfter: 2000,
    });
  });

  extComm.on("notificationSuccess", (data) => {
    addNotification({
      text: data.message,
      position: "top-right",
      type: "success",
      removeAfter: 2000,
    });
  });
</script>
