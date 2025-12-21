<script setup lang="ts">
import Card from "primevue/card";
import { onMounted, onUnmounted, ref } from "vue";

import { useDocContent, useSections } from "./useContent";

const { sections } = useSections();
const {
  quickStartSteps,
  supportedFormats,
  authMethods,
  troubleshootingItems,
  aboutInfo,
} = useDocContent();

const activeSection = ref("what-is-redocs");
const contentRef = ref<HTMLElement>();

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element && contentRef.value) {
    contentRef.value.scrollTo({
      top: element.offsetTop - 20,
      behavior: "smooth",
    });
  }
};

const handleScroll = () => {
  if (contentRef.value === undefined) return;

  const scrollPosition = contentRef.value.scrollTop + 200;

  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i];
    if (section === undefined) continue;
    const element = document.getElementById(section.id);
    if (element !== null && element.offsetTop <= scrollPosition) {
      activeSection.value = section.id;
      break;
    }
  }
};

onMounted(() => {
  contentRef.value?.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  contentRef.value?.removeEventListener("scroll", handleScroll);
});

const isSectionActive = (sectionId: string) => {
  return activeSection.value === sectionId;
};
</script>

<template>
  <div class="h-full flex gap-1">
    <Card
      class="h-full w-[200px]"
      :pt="{
        body: { class: 'h-full p-0 flex flex-col' },
        content: { class: 'h-full flex flex-col' },
      }"
    >
      <template #content>
        <div class="h-full overflow-auto p-4">
          <nav class="space-y-1">
            <div
              v-for="section in sections"
              :key="section.id"
              class="cursor-pointer py-2 px-3 rounded text-sm transition-colors"
              :class="
                isSectionActive(section.id)
                  ? 'bg-surface-700 text-white font-medium'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-white'
              "
              @click="scrollToSection(section.id)"
            >
              {{ section.title }}
            </div>
          </nav>
        </div>
      </template>
    </Card>

    <Card
      class="h-full flex-1"
      :pt="{
        body: { class: 'h-full p-0 flex flex-col' },
        content: { class: 'h-full flex flex-col overflow-auto' },
      }"
    >
      <template #content>
        <div ref="contentRef" class="h-full overflow-auto p-4">
          <div class="max-w-3xl space-y-12 pb-[36rem]">
            <!-- What is ReDocs -->
            <section id="what-is-redocs">
              <h2 class="text-2xl font-semibold mb-4">What is ReDocs?</h2>
              <p class="text-surface-300 leading-relaxed mb-4">
                ReDocs is a plugin for Caido that imports API documentation
                files (Postman Collections, OpenAPI specs, and Postman
                Environments) and converts them into ready-to-use Caido Replay
                sessions.
              </p>
              <p class="text-surface-300 leading-relaxed">
                Simply drop your documentation file, configure authentication if
                needed, and start security testing your API endpoints
                immediately in Caido's powerful Replay interface.
              </p>
            </section>

            <!-- Quick Start -->
            <section id="quick-start">
              <h2 class="text-2xl font-semibold mb-4">Quick Start</h2>
              <p class="text-surface-300 leading-relaxed mb-6">
                Get up and running with ReDocs in just a few steps:
              </p>

              <div class="space-y-4">
                <div
                  v-for="step in quickStartSteps"
                  :key="step.title"
                  class="border border-surface-700 rounded p-4"
                >
                  <h3 class="text-lg font-semibold mb-3">{{ step.title }}</h3>
                  <p class="text-surface-300 leading-relaxed">
                    {{ step.content }}
                  </p>
                </div>
              </div>

              <div
                class="mt-6 bg-surface-800 border border-surface-700 rounded p-4"
              >
                <p class="text-surface-300 text-sm">
                  <i class="fas fa-rocket text-secondary-400 mr-2"></i>
                  That's it! Navigate to Replay in Caido to find your imported
                  sessions organized in a new collection.
                </p>
              </div>
            </section>

            <!-- Supported Formats -->
            <section id="supported-formats">
              <h2 class="text-2xl font-semibold mb-4">Supported Formats</h2>
              <p class="text-surface-300 leading-relaxed mb-6">
                ReDocs supports the following file formats:
              </p>

              <div class="space-y-6">
                <div
                  v-for="format in supportedFormats"
                  :key="format.title"
                  class="border border-surface-700 rounded p-4"
                >
                  <h3 class="text-lg font-semibold mb-2" :class="format.color">
                    {{ format.title }}
                  </h3>
                  <ul class="text-surface-300 text-sm space-y-1">
                    <li v-for="item in format.items" :key="item">
                      • {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- Authentication -->
            <section id="authentication">
              <h2 class="text-2xl font-semibold mb-4">Authentication</h2>
              <p class="text-surface-300 leading-relaxed mb-6">
                ReDocs supports multiple authentication methods:
              </p>

              <div class="space-y-4">
                <div
                  v-for="auth in authMethods"
                  :key="auth.title"
                  class="border-l-4 border-secondary-400 pl-4"
                >
                  <h4 class="font-semibold mb-1">{{ auth.title }}</h4>
                  <p class="text-surface-300 text-sm">{{ auth.description }}</p>
                </div>
              </div>
            </section>

            <!-- Environment Variables -->
            <section id="environment-variables">
              <h2 class="text-2xl font-semibold mb-4">Environment Variables</h2>
              <p class="text-surface-300 leading-relaxed mb-6">
                Import Postman Environment files to create Caido environments:
              </p>

              <div class="space-y-4">
                <div class="border border-surface-700 rounded p-4">
                  <h4 class="font-semibold mb-2">How it Works</h4>
                  <ol
                    class="list-decimal list-inside space-y-2 text-surface-300 text-sm"
                  >
                    <li>Export your environment from Postman as JSON</li>
                    <li>Drop the file in ReDocs</li>
                    <li>Select which variables to import</li>
                    <li>ReDocs creates a new Caido environment</li>
                  </ol>
                </div>

                <div
                  class="bg-surface-800 border border-surface-700 rounded p-4"
                >
                  <p class="text-surface-300 text-sm">
                    <i class="fas fa-lock text-secondary-400 mr-2"></i>
                    <strong>Secret Detection:</strong> Variables with names
                    containing "token", "key", "secret", or "password" are
                    automatically marked as secrets.
                  </p>
                </div>
              </div>
            </section>

            <!-- Troubleshooting -->
            <section id="troubleshooting">
              <h2 class="text-2xl font-semibold mb-4">Troubleshooting</h2>

              <div class="space-y-4">
                <div
                  v-for="item in troubleshootingItems"
                  :key="item.title"
                  class="pb-4 border-b border-surface-700 last:border-b-0"
                >
                  <h5 class="font-semibold mb-2">{{ item.title }}</h5>
                  <p class="text-surface-300 text-sm">{{ item.description }}</p>
                </div>
              </div>
            </section>

            <!-- About -->
            <section id="about">
              <h2 class="text-2xl font-semibold mb-4">About</h2>
              <p class="text-surface-300 leading-relaxed mb-6">
                {{ aboutInfo.description }}
              </p>

              <div class="border border-surface-700 rounded p-4">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="text-xl font-bold">{{ aboutInfo.name }}</h3>
                    <p class="text-sm text-surface-400">
                      Version {{ aboutInfo.version }}
                    </p>
                  </div>
                </div>

                <div class="pt-4 border-t border-surface-700">
                  <div
                    class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    <div class="text-sm text-surface-300">
                      <span class="font-medium">Made with</span>
                      <i class="fas fa-heart text-secondary-400 mx-1"></i>
                      <span class="font-medium">by</span>
                      <a
                        :href="aboutInfo.author.website"
                        target="_blank"
                        class="font-medium text-secondary-400 hover:text-secondary-300 transition-colors ml-1"
                      >
                        {{ aboutInfo.author.name }}
                      </a>
                    </div>
                    <div class="flex gap-4">
                      <a
                        :href="`mailto:${aboutInfo.author.email}`"
                        class="text-sm text-secondary-400 hover:text-secondary-300 transition-colors flex items-center gap-1"
                      >
                        <i class="fas fa-envelope"></i>
                        Email
                      </a>
                      <a
                        :href="aboutInfo.author.linkedin"
                        target="_blank"
                        class="text-sm text-secondary-400 hover:text-secondary-300 transition-colors flex items-center gap-1"
                      >
                        <i class="fab fa-linkedin"></i>
                        LinkedIn
                      </a>
                      <a
                        :href="aboutInfo.author.twitter"
                        target="_blank"
                        class="text-sm text-secondary-400 hover:text-secondary-300 transition-colors flex items-center gap-1"
                      >
                        <i class="fab fa-x-twitter"></i>
                        X/Twitter
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
