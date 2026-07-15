import { ceremonialDocuments } from "@/lib/ceremonial-knowledge";
import { AssistantChat } from "./assistant-chat";

export default function AssistantPage() {
  return <AssistantChat documents={ceremonialDocuments} />;
}
