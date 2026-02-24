import { ref } from "vue";

import type { ProcessedRequest, RequestSpec } from "../types/index.js";
import type { FrontendSDK } from "../types.js";
import { buildRawRequest } from "../utils";

type ReplayCollection = { name: string; id: string };

export const useReplaySession = (sdk: FrontendSDK) => {
  const isCreating = ref(false);
  const creationProgress = ref("");

  const createReplaySessionsInFrontend = async (
    processedRequests: ProcessedRequest[],
    collectionName: string,
  ): Promise<number> => {
    try {
      isCreating.value = true;
      creationProgress.value = "Creating collection...";

      const collections = sdk.replay.getCollections() as ReplayCollection[];
      let finalCollectionName = collectionName;
      let targetCollectionId = collections.find(
        (c) => c.name === finalCollectionName,
      )?.id;

      if (targetCollectionId !== undefined) {
        let counter = 1;
        do {
          finalCollectionName = `${collectionName}${counter}`;
          targetCollectionId = collections.find(
            (c) => c.name === finalCollectionName,
          )?.id;
          counter++;
        } while (targetCollectionId !== undefined && counter < 100);
      }

      const createCollectionResult =
        await sdk.graphql.createReplaySessionCollection({
          input: {
            name: finalCollectionName,
          },
        });

      if (
        !createCollectionResult.createReplaySessionCollection?.collection?.id
      ) {
        throw new Error(
          "Failed to create collection: No collection ID returned",
        );
      }

      targetCollectionId =
        createCollectionResult.createReplaySessionCollection.collection.id;

      let createdCount = 0;
      const sessionErrors: string[] = [];

      const processSession = async (
        spec: RequestSpec,
        sessionName: string,
        index: number,
      ): Promise<void> => {
        try {
          creationProgress.value = `Creating session ${index + 1}/${processedRequests.length}...`;

          const createSessionResult = await sdk.graphql.createReplaySession({
            input: {
              requestSource: {
                raw: {
                  raw: buildRawRequest(spec),
                  connectionInfo: {
                    host: spec.host || "example.com",
                    port: spec.port || (spec.tls !== false ? 443 : 80),
                    isTLS: spec.tls !== false,
                  },
                },
              },
            },
          });

          const sessionId =
            createSessionResult.createReplaySession?.session?.id;
          if (!sessionId) {
            const errorMsg = "Failed to get session ID after creation";
            sessionErrors.push(`Session ${index + 1}: ${errorMsg}`);
            return;
          }

          const replay = sdk.replay as unknown as {
            moveSession: (
              sessionId: string,
              collectionId: string,
            ) => Promise<unknown>;
          };
          try {
            await replay.moveSession(sessionId, targetCollectionId);
          } catch (moveError: unknown) {
            const msg =
              moveError instanceof Error
                ? moveError.message
                : String(moveError);
            sessionErrors.push(`Session ${index + 1} move: ${msg}`);
          }

          try {
            await sdk.graphql.renameReplaySession({
              id: sessionId,
              name: sessionName,
            });
          } catch (renameError: unknown) {
            const msg =
              renameError instanceof Error
                ? renameError.message
                : String(renameError);
            sessionErrors.push(`Session ${index + 1} rename: ${msg}`);
          }

          createdCount++;
        } catch (sessionError: unknown) {
          const msg =
            sessionError instanceof Error
              ? sessionError.message
              : String(sessionError);
          sessionErrors.push(`Session ${index + 1}: ${msg}`);
        }
      };

      const batchSize = 5;
      for (let i = 0; i < processedRequests.length; i += batchSize) {
        const batch = processedRequests.slice(i, i + batchSize);

        const batchPromises = batch.map((item, batchIndex) =>
          processSession(item.spec, item.sessionName, i + batchIndex),
        );

        try {
          // eslint-disable-next-line compat/compat
          await Promise.all(batchPromises);
        } catch (batchError: unknown) {
          const msg =
            batchError instanceof Error
              ? batchError.message
              : String(batchError);
          console.warn("Batch processing error (continuing):", msg);
        }

        if (i + batchSize < processedRequests.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (sessionErrors.length > 0) {
        console.warn("Some sessions failed to create:", sessionErrors);

        sdk.window.showToast(
          `${createdCount}/${processedRequests.length} sessions created successfully. Check console for details on failed sessions.`,
          { variant: "warning", duration: 6000 },
        );
      }

      return createdCount;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Session creation failed: ${message}`);
    } finally {
      isCreating.value = false;
      creationProgress.value = "";
    }
  };

  return {
    isCreating,
    creationProgress,
    createReplaySessionsInFrontend,
  };
};
