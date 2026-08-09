import { createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader } from "@/components/fitcore/primitives";
import { ChatPanel } from "@/components/fitcore/chat-panel";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/cliente/chat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chat · FITCORE" },
      { property: "og:title", content: "Chat · FITCORE" },
      { property: "og:description", content: "Conversa directamente con tu entrenador." },
    ],
  }),
  component: ChatCliente,
});

function ChatCliente() {
  const { clientId } = useAuth();

  if (!clientId) {
    return (
      <EmptyState
        title="Tu cuenta aún no está vinculada"
        description="Pide a tu entrenador que registre tu correo en su lista de clientes."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Chat" subtitle="Habla con tu entrenador" />
      <ChatPanel clientId={clientId} />
    </div>
  );
}
