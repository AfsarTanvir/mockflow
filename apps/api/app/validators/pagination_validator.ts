import vine from '@vinejs/vine';
import { MAX_CURSOR_LIMIT } from '#queries/pagination';

/**
 * Request params for the keyset-paginated feeds. `cursor` is opaque to the
 * client (base64url of `created_at|id`) — it is only length-bounded here and
 * decoded in `#queries/pagination`, which rejects anything malformed with a 400.
 */

/** Fresh nodes per call — VineJS schema nodes must not be shared across schemas. */
export const cursorList = () => ({
  cursor: vine.string().trim().maxLength(200).optional(),
  limit: vine.number().min(1).max(MAX_CURSOR_LIMIT).optional(),
});

export const cursorListValidator = vine.compile(vine.object(cursorList()));
