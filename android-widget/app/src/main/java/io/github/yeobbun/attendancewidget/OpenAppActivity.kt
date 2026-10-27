package io.github.yeobbun.attendancewidget

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.widget.Toast

/**
 * 위젯을 누르면 출결 앱을 연다. 안드로이드 14부터는 목록용 PendingIntent 가
 * 이 앱 안의 화면을 가리켜야 해서, 여기서 한 번 거쳐 넘긴다.
 *
 * 출결 앱을 홈 화면 앱으로 설치해 두었으면 브라우저 대신 그 앱으로 연다.
 * 안드로이드 12부터 링크는 기본 브라우저로 가므로, 이 주소만 여는 앱(설치형 웹앱)을 찾아 직접 지정한다.
 */
class OpenAppActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val view = Intent(Intent.ACTION_VIEW, Uri.parse(Prefs(this).appUrl))
            .addCategory(Intent.CATEGORY_BROWSABLE)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        siteApp(view)?.let { view.setPackage(it) }
        try {
            startActivity(view)
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(this, "출결 앱 주소를 열 수 없어요. 설정에서 주소를 확인해 주세요.", Toast.LENGTH_LONG).show()
        }
        finish()
    }

    /** 이 주소는 열지만 아무 사이트나 열지는 않는 앱 = 설치형 웹앱. 없으면 null (브라우저로 연다) */
    private fun siteApp(view: Intent): String? {
        val pm = packageManager
        val any = Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com/")).addCategory(Intent.CATEGORY_BROWSABLE)
        val browsers = pm.queryIntentActivities(any, PackageManager.MATCH_ALL).map { it.activityInfo.packageName }.toSet()
        return pm.queryIntentActivities(view, PackageManager.MATCH_ALL)
            .map { it.activityInfo.packageName }
            .firstOrNull { it !in browsers && it != packageName }
    }
}
