package io.github.yeobbun.attendancewidget

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast

/**
 * 위젯 목록 줄을 누르면 출결 앱(웹)을 연다. 안드로이드 14부터는 목록용 PendingIntent 가
 * 이 앱 안의 화면을 가리켜야 해서, 여기서 한 번 거쳐 브라우저로 넘긴다.
 */
class OpenAppActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Prefs(this).appUrl)))
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(this, "출결 앱 주소를 열 수 없어요. 설정에서 주소를 확인해 주세요.", Toast.LENGTH_LONG).show()
        }
        finish()
    }
}
