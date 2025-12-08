"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { X, Volume2, VolumeX, Bell, Check } from "lucide-react"
import { getSettings, saveSettings, playTestSound, type GameSettings } from "@/lib/settings"
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications"
import { ROOM_STYLES, type RoomStyleId } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  roomStyleId?: RoomStyleId
  onStyleChange?: (styleId: RoomStyleId) => void
  isHost?: boolean
}

export function SettingsModal({ isOpen, onClose, roomStyleId, onStyleChange, isHost }: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>(getSettings())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings())
      setNotificationPermission(getNotificationPermission())
    }
  }, [isOpen])

  const handleSoundToggle = (enabled: boolean) => {
    const updated = saveSettings({ soundEnabled: enabled })
    setSettings(updated)
    if (enabled) {
      playTestSound()
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const updated = saveSettings({ soundVolume: value[0] })
    setSettings(updated)
  }

  const handleVolumeCommit = () => {
    playTestSound()
  }

  const handleRequestNotifications = async () => {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 bg-card border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {roomStyleId && onStyleChange && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Room Background</h3>

              <div className="grid grid-cols-1 gap-2">
                {Object.values(ROOM_STYLES).map((style) => (
                  <button
                    key={style.id}
                    onClick={() => isHost && onStyleChange(style.id)}
                    disabled={!isHost}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      style.id === roomStyleId
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50",
                      !isHost && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-md", style.background)} />
                      <span className="font-medium text-foreground">{style.name}</span>
                    </div>
                    {style.id === roomStyleId && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>

              {!isHost && <p className="text-xs text-muted-foreground">Only the host can change the room background</p>}
            </div>
          )}

          {/* Sound Settings */}
          <div className={cn("space-y-4", roomStyleId && "pt-4 border-t border-border")}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sound</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-foreground">Turn Notification Sound</p>
                  <p className="text-sm text-muted-foreground">Play a sound when it&apos;s your turn</p>
                </div>
              </div>
              <Switch checked={settings.soundEnabled} onCheckedChange={handleSoundToggle} />
            </div>

            {settings.soundEnabled && (
              <div className="pl-8 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Volume</span>
                  <span className="text-sm text-muted-foreground">{Math.round(settings.soundVolume * 100)}%</span>
                </div>
                <Slider
                  value={[settings.soundVolume]}
                  onValueChange={handleVolumeChange}
                  onValueCommit={handleVolumeCommit}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <Button variant="outline" size="sm" onClick={playTestSound} className="mt-2 bg-transparent">
                  Test Sound
                </Button>
              </div>
            )}
          </div>

          {/* Push Notifications */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Push Notifications</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Browser Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    {notificationPermission === "granted"
                      ? "Enabled - you'll be notified when it's your turn"
                      : notificationPermission === "denied"
                        ? "Blocked - enable in browser settings"
                        : "Get notified even when the tab is in background"}
                  </p>
                </div>
              </div>
              {notificationPermission === "default" && (
                <Button variant="outline" size="sm" onClick={handleRequestNotifications}>
                  Enable
                </Button>
              )}
              {notificationPermission === "granted" && (
                <span className="text-sm text-primary font-medium">Enabled</span>
              )}
              {notificationPermission === "denied" && (
                <span className="text-sm text-destructive font-medium">Blocked</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </Card>
    </div>
  )
}
