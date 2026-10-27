package io.github.yeobbun.attendancewidget

import android.content.Context

/** 연결 정보와 마지막으로 받은 목록. 이 앱 안에만 저장된다. */
class Prefs(ctx: Context) {
    private val sp = ctx.getSharedPreferences("widget", Context.MODE_PRIVATE)

    var repo: String
        get() = sp.getString("repo", "") ?: ""
        set(v) = sp.edit().putString("repo", v).apply()
    var token: String
        get() = sp.getString("token", "") ?: ""
        set(v) = sp.edit().putString("token", v).apply()
    var passphrase: String
        get() = sp.getString("passphrase", "") ?: ""
        set(v) = sp.edit().putString("passphrase", v).apply()
    var appUrl: String
        get() = sp.getString("appUrl", DEFAULT_APP_URL) ?: DEFAULT_APP_URL
        set(v) = sp.edit().putString("appUrl", v).apply()

    val configured get() = repo.isNotBlank() && token.isNotBlank() && passphrase.isNotBlank()

    /** 받은 요약 원문(푼 것)과 그 파일의 sha */
    var summaryJson: String?
        get() = sp.getString("summary", null)
        set(v) = sp.edit().putString("summary", v).apply()
    var sha: String?
        get() = sp.getString("sha", null)
        set(v) = sp.edit().putString("sha", v).apply()
    /** 마지막으로 확인에 성공한 시각 (ms) */
    var checkedAt: Long
        get() = sp.getLong("checkedAt", 0)
        set(v) = sp.edit().putLong("checkedAt", v).apply()
    var error: String?
        get() = sp.getString("error", null)
        set(v) = sp.edit().putString("error", v).apply()

    fun summary(): PendingSummary? = summaryJson?.let { runCatching { Pending.parse(it) }.getOrNull() }

    /** 연결 정보가 바뀌면 받아 둔 것을 버린다 */
    fun clearCache() = sp.edit().remove("summary").remove("sha").remove("checkedAt").remove("error").apply()

    companion object {
        const val DEFAULT_APP_URL = "https://yeobbun.github.io/school-attendance/"
    }
}
