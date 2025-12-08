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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <Card className="w-full sm:max-w-md p-3 sm:p-6 bg-card border-border max-h-[80vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold text-foreground">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 sm:h-10 sm:w-10">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        <div className="space-y-3 sm:space-y-6">
          {roomStyleId && onStyleChange && (
            <div className="space-y-2 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Room Background
              </h3>

              <div className="grid grid-cols-3 sm:grid-cols-1 gap-1.5 sm:gap-2">
                {Object.values(ROOM_STYLES).map((style) => (
                  <button
                    key={style.id}
                    onClick={() => isHost && onStyleChange(style.id)}
                    disabled={!isHost}
                    className={cn(
                      "flex flex-col sm:flex-row items-center gap-1 sm:gap-3 p-1.5 sm:p-3 rounded-lg border transition-all",
                      "sm:justify-between",
                      style.id === roomStyleId
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50",
                      !isHost && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                      <div className={cn("w-8 h-8 sm:w-8 sm:h-8 rounded-md flex-shrink-0", style.background)} />
                      <span className="font-medium text-foreground text-[10px] sm:text-base truncate">
                        {style.name}
                      </span>
                    </div>
                    {style.id === roomStyleId && (
                      <Check className="w-3 h-3 sm:w-5 sm:h-5 text-primary absolute top-1 right-1 sm:static" />
                    )}
                  </button>
                ))}
              </div>

              {!isHost && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Only the host can change the room background
                </p>
              )}
            </div>
          )}

          {/* Sound Settings - tighter spacing */}
          <div className={cn("space-y-2 sm:space-y-4", roomStyleId && "pt-3 sm:pt-4 border-t border-border")}>
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sound</h3>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm">Turn Sound</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Play when it&apos;s your turn</p>
                </div>
              </div>
              <Switch checked={settings.soundEnabled} onCheckedChange={handleSoundToggle} />
            </div>

            {settings.soundEnabled && (
              <div className="pl-6 sm:pl-8 space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">Vol</span>
                  <Slider
                    value={[settings.soundVolume]}
                    onValueChange={handleVolumeChange}
                    onValueCommit={handleVolumeCommit}
                    min={0}
                    max={1}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground w-8 text-right">
                    {Math.round(settings.soundVolume * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={playTestSound}
                    className="bg-transparent h-7 text-xs px-2 sm:h-8 sm:text-sm sm:px-3"
                  >
                    Test
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Push Notifications - tighter spacing */}
          <div className="space-y-2 sm:space-y-4 pt-3 sm:pt-4 border-t border-border">
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Notifications
            </h3>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm">Browser Alerts</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">
                    {notificationPermission === "granted"
                      ? "Enabled"
                      : notificationPermission === "denied"
                        ? "Blocked in browser"
                        : "Background alerts"}
                  </p>
                </div>
              </div>
              {notificationPermission === "default" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestNotifications}
                  className="h-7 text-xs px-2 sm:h-8 sm:text-sm sm:px-3 bg-transparent"
                >
                  Enable
                </Button>
              )}
              {notificationPermission === "granted" && (
                <span className="text-xs sm:text-sm text-primary font-medium">On</span>
              )}
              {notificationPermission === "denied" && (
                <span className="text-xs sm:text-sm text-destructive font-medium">Off</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-6 pt-3 sm:pt-4 border-t border-border">
          <Button onClick={onClose} className="w-full h-9 sm:h-10 text-sm sm:text-base">
            Done
          </Button>
        </div>
      </Card>
    </div>
  )
}
