<script lang="ts">
  import extComm from "@/messaging";
  import { getNotificationsContext } from "svelte-notifications";
  const { addNotification } = getNotificationsContext();

  extComm.on("notification", (data) => {
    addNotification({
      text: data.message,
      position: "top-center",
      type: "info",
      removeAfter: 2000,
    });
  });

  extComm.on("notificationError", (data) => {
    addNotification({
      text: data.message,
      position: "top-center",
      type: "error",
      removeAfter: 2000,
    });
  });

  extComm.on("notificationWarning", (data) => {
    addNotification({
      text: data.message,
      position: "top-center",
      type: "warning",
      removeAfter: 2000,
    });
  });

  extComm.on("notificationSuccess", (data) => {
    addNotification({
      text: data.message,
      position: "top-center",
      type: "success",
      removeAfter: 2000,
    });
  });
</script>
