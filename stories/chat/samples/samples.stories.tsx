import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../src/ui/table.js";
import { samples } from "./conversations.js";
import { turnFrames } from "./play-turn.js";

export default { title: "Chat / Samples" };

/** The shared sample conversations the chat stories draw on, and how big each is. */
export const Sizes = () => (
  <div className="max-w-2xl">
    <Table>
      <TableCaption>
        Sample conversations. Frames counts the steps a streaming story plays
        for the sample's last message.
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Sample</TableHead>
          <TableHead scope="col">Messages</TableHead>
          <TableHead scope="col">Parts</TableHead>
          <TableHead scope="col">Thread replies</TableHead>
          <TableHead scope="col">Frames</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {samples.map((sample) => {
          const last = sample.messages.at(-1);
          return (
            <TableRow key={sample.title}>
              <TableHead scope="row" className="text-foreground">
                {sample.title}
              </TableHead>
              <TableCell>{sample.messages.length}</TableCell>
              <TableCell>
                {sample.messages.reduce(
                  (total, message) => total + message.parts.length,
                  0,
                )}
              </TableCell>
              <TableCell>{sample.thread?.replies.length ?? 0}</TableCell>
              <TableCell>
                {last === undefined ? 0 : turnFrames(last).length}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);
