"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export default function Home() {
  const [text, setText] = useState("")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Save logic here
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    setText("")
    setSaved(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Loft Visualizer
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            A simple app for authoring and visualizing loft geometry
          </p>
        </div>

        <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Text Editor
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    saved
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  )}
                >
                  {saved ? "Saved!" : "Save"}
                </button>
                <button
                  onClick={handleClear}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing your loft geometry data here..."
              className={cn(
                "w-full resize-none rounded-md border border-gray-300 px-3 py-2",
                "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0",
                "dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400",
                "min-h-[400px] font-mono text-sm"
              )}
            />
          </div>

          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Characters: {text.length} | Words: {text.trim() ? text.trim().split(/\s+/).length : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}