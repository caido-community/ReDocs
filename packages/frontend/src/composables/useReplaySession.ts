import { ref } from "vue";

import type { ProcessedRequest } from "../types/index.js";
import type { FrontendSDK } from "../types.js";
import { buildRawRequest } from "../utils";

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

      const collections = sdk.replay.getCollections();
      let finalCollectionName = collectionName;
      let targetCollectionId = collections.find(
        (c: any) => c.name === finalCollectionName,
      )?.id;

      if (targetCollectionId) {
        let counter = 1;
        do {
          finalCollectionName = `${collectionName}${counter}`;
          targetCollectionId = collections.find(
            (c: any) => c.name === finalCollectionName,
          )?.id;
          counter++;
        } while (targetCollectionId && counter < 100);
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
        spec: any,
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

          try {
            await (sdk.replay as any).moveSession(
              sessionId,
              targetCollectionId,
            );
          } catch (moveError: any) {
            sessionErrors.push(
              `Session ${index + 1} move: ${moveError.message}`,
            );
          }

          try {
            await sdk.graphql.renameReplaySession({
              id: sessionId,
              name: sessionName,
            });
          } catch (renameError: any) {
            sessionErrors.push(
              `Session ${index + 1} rename: ${renameError.message}`,
            );
          }

          createdCount++;
        } catch (sessionError: any) {
          sessionErrors.push(`Session ${index + 1}: ${sessionError.message}`);
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
        } catch (batchError: any) {
          console.warn(
            "Batch processing error (continuing):",
            batchError.message,
          );
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
    } catch (error: any) {
      throw new Error(`Session creation failed: ${error.message}`);
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
