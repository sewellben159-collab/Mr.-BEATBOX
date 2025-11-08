
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: {
    uri: string;
    title: string;
  }[];
}
